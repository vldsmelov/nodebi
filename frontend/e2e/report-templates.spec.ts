import { test, expect, request as createRequest } from "@playwright/test";
import { configureFormLayout, expectFormFits, formLayouts } from "./form-reflow";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";
test.use({ actionTimeout: 15_000 });

for (const layout of formLayouts) for (const presentation of ["combo_chart", "radar_chart"] as const) test(`reuse ${presentation} formulas on renamed data with capture and draft recovery (${layout})`, async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  await configureFormLayout(page, layout);
  page.on("dialog", dialog => dialog.accept());
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Report templates" } })).json();
  const root = `${api}/api/v1/projects/${project.id}`;
  const imported = async (name: string, content: string) => {
    const source = await (await request.post(`${root}/imports`, { multipart: { connector: "csv", file: { name: `${name}.csv`, mimeType: "text/csv", buffer: Buffer.from(content) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const applied = await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } });
    expect(applied.ok()).toBeTruthy(); return { source, profile, snapshot: await applied.json() };
  };
  try {
    const first = await imported("Original", "group,actual,plan\nA,0.10,0.20\nA,0.20,0.30\n");
    const second = await imported("New data", "Budget,Team,Revenue\n4.00,X,1.00\n6.00,X,2.00\n");
    const [group, actual, plan] = first.profile.fields.map((f: { field_id: string }) => f.field_id);
    const rowId = crypto.randomUUID(), summaryId = crypto.randomUUID(), outputs = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    const measureIds = outputs.map(id => `measure_${id.replaceAll("-", "")}`);
    const settings = {
      name: "Original report", dimensions: [group], presentation,
      row_formulas: [{ node_id: rowId, name: "Double", expression: `[${actual}] * 2.00`, scale: 2 }],
      measures: [{ output_id: outputs[0], name: "Actual", operation: "sum", column_id: `calc_${rowId.replaceAll("-", "")}` }, { output_id: outputs[1], name: "Plan", operation: "sum", column_id: plan }, { output_id: outputs[2], name: "Base", operation: "sum", column_id: actual }],
      summary_formulas: [{ node_id: summaryId, name: "Ratio", expression: `[${measureIds[0]}] / [${measureIds[1]}]`, scale: 4 }],
      ...(presentation === "combo_chart" ? { combo: { type: presentation, category_column_id: group, series: [{ column_id: measureIds[0], kind: "bar" }, { column_id: measureIds[1], kind: "line" }] } } : { radar: { type: presentation, profile_column_id: group, normalization: "shared", axes: [measureIds[0], measureIds[1], `calc_${summaryId.replaceAll("-", "")}`].map(column_id => ({ column_id, minimum: "0", maximum: "100" })) } }),
    };
    const created = await request.post(`${root}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: first.source.id, resource_id: "table", expected_snapshot_id: first.snapshot.id, ...settings } });
    expect(created.ok(), await created.text()).toBeTruthy(); const ids = await created.json();
    const original = await (await request.get(`${api}/api/v1/workflows/${ids.workflow_id}`)).json();
    await page.goto(`/projects/${project.id}/build?visualization=${ids.visualization_id}`);
    await page.getByRole("button", { name: "Save calculation template", exact: true }).click();
    await page.getByLabel("Template name", { exact: true }).fill("Reusable performance");
    await page.getByLabel("Expected row meaning", { exact: true }).fill("One observation with actual and plan in the same unit");
    await expectFormFits(page);
    const sends: string[] = [];
    await page.route("**/report-templates", async route => {
      if (route.request().method() !== "POST") return route.continue();
      sends.push(route.request().postData()!);
      if (sends.length === 1) { expect((await route.fetch()).ok()).toBeTruthy(); await route.abort("connectionreset"); }
      else await route.continue();
    });
    await page.getByRole("button", { name: "Save template", exact: true }).click();
    await expect(page.getByRole("button", { name: "Retry template save", exact: true })).toBeEnabled();
    await page.route(`**/report-builder/${ids.visualization_id}`, route => route.abort("connectionreset"));
    await page.reload();
    await page.getByRole("button", { name: "Save calculation template", exact: true }).click();
    await page.getByRole("button", { name: "Retry template save", exact: true }).click();
    await expect(page.getByText(/Template saved\./)).toBeVisible();
    expect(sends).toHaveLength(2); expect(sends[1]).toBe(sends[0]);
    await page.unroute(`**/report-builder/${ids.visualization_id}`);
    const templates = (await (await request.get(`${root}/report-templates`)).json()).items;
    expect(templates).toHaveLength(1);
    await page.goto(`/projects/${project.id}/build`);
    await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption(second.snapshot.id);
    await page.getByRole("button", { name: "Use report template", exact: true }).click();
    await page.getByRole("combobox", { name: "Report template", exact: true }).selectOption(templates[0].id);
    await page.getByLabel("Map field group", { exact: true }).selectOption(second.profile.fields[1].field_id);
    await page.getByLabel("Map field actual", { exact: true }).selectOption(second.profile.fields[2].field_id);
    await page.getByLabel("Map field plan", { exact: true }).selectOption(second.profile.fields[0].field_id);
    await expect(page.getByRole("button", { name: "Load template settings", exact: true })).toBeDisabled();
    await page.getByLabel("The selected data has the expected row meaning and units", { exact: true }).check();
    await expectFormFits(page);
    await page.screenshot({ path: testInfo.outputPath("template-mapping.png"), fullPage: true });
    await page.getByRole("button", { name: "Load template settings", exact: true }).click();
    await expect(page.getByRole("button", { name: "Add measure", exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Presentation", exact: true })).toHaveValue(presentation);
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeEnabled();
    await expectFormFits(page);
    const canvas = page.getByRole("img", { name: "Reusable performance", exact: true }).locator("canvas").first();
    await expect(canvas).toBeVisible();
    let previousFrame = "", stableFrames = 0;
    await expect.poll(async () => {
      const frame = await canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL());
      stableFrames = frame === previousFrame ? stableFrames + 1 : 0; previousFrame = frame;
      return stableFrames;
    }, { intervals: [100] }).toBeGreaterThanOrEqual(3);
    await page.screenshot({ path: testInfo.outputPath("reused-report.png"), fullPage: true, animations: "disabled" });
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\?/); await page.reload();
    await expect(page.getByRole("img", { name: "Reusable performance", exact: true }).locator("canvas").first()).toBeVisible();
    const visuals = (await (await request.get(`${root}/visualizations`)).json()).items;
    expect(visuals).toHaveLength(2);
    const reused = visuals.find((v: { id: string }) => v.id !== ids.visualization_id);
    const result = await (await request.post(`${api}/api/v1/visualizations/${reused.id}/result`, { data: {} })).json();
    expect(result.rows[0]).toMatchObject({ Actual: "6.00", Plan: "10.00" });
    const editUrl = `${root}/report-builder/${reused.id}`;
    const detail = await (await request.get(editUrl)).json();
    const checked = await request.post(`${editUrl}/preview`, { data: { request_id: crypto.randomUUID(), expected_token: detail.expected_token, settings: detail.settings } });
    expect(checked.ok(), await checked.text()).toBeTruthy();
    const full = await checked.json();
    const team = full.columns.find((c: { display_name: string }) => c.display_name === "Team").engine_name;
    expect(full.rows[0]).toMatchObject({ [team]: "X", Actual: "6.00", Plan: "10.00", Ratio: "0.6000" });
    expect(await (await request.get(`${api}/api/v1/workflows/${ids.workflow_id}`)).json()).toEqual(original);
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${root}?confirm=true`)).ok()).toBeTruthy(); await cleanup.dispose();
  }
});
