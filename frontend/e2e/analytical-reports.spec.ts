import { test, expect, request as createRequest } from "@playwright/test";
import { configureFormLayout, expectFormFits, formLayouts } from "./form-reflow";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const layout of formLayouts) for (const kind of ["heatmap_stats", "table_rollup", "pareto", "funnel_steps", "treemap_chart", "sunburst_chart"] as const) test(`guided ${kind} restores settings and saves the previewed calculation (${layout})`, async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  await configureFormLayout(page, layout);
  page.on("dialog", dialog => dialog.accept());
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: `Guided ${kind}` } })).json();
  const root = `${api}/api/v1/projects/${project.id}`;
  try {
    const content = ["heatmap_stats", "table_rollup"].includes(kind)
      ? "region,value,period,plan\nA,10.00,Jan,5.00\nA,20.00,Jan,15.00\nA,0.00,Feb,0.00\nB,,Jan,10.00\n"
      : "region,value,period,plan\nA,100.00,1,North\nB,60.00,2,North\nC,20.00,3,South\n";
    const source = await (await request.post(`${root}/imports`, { multipart: { connector: "csv", file: { name: "Sales.csv", mimeType: "text/csv", buffer: Buffer.from(content) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const field = (index: number) => profile.fields[index].field_id;
    await page.goto(`/projects/${project.id}/build`);
    await page.getByRole("link", { name: "Create analytical report", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create analytical report", exact: true })).toBeVisible();
    await page.getByLabel("Report name", { exact: true }).fill("Sales analysis");
    await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption(snapshot.id);
    await page.getByRole("combobox", { name: "Analysis type", exact: true }).selectOption(kind);
    if (kind === "heatmap_stats") {
      await page.getByLabel("Heatmap X dimension", { exact: true }).selectOption(field(0));
      await page.getByLabel("Heatmap Y dimension", { exact: true }).selectOption(field(2));
      await page.getByLabel("Heatmap value", { exact: true }).selectOption(field(1));
      await expect(page.getByRole("button", { name: "Preview calculation", exact: true })).toBeDisabled();
      await page.getByRole("combobox", { name: "Cell aggregation", exact: true }).selectOption("sum");
    } else if (kind === "pareto") {
      await page.getByLabel("Pareto category", { exact: true }).selectOption(field(0));
      await page.getByLabel("Pareto contribution", { exact: true }).selectOption(field(1));
    } else if (kind === "funnel_steps") {
      await page.getByLabel("Funnel stage", { exact: true }).selectOption(field(0));
      await page.getByLabel("Stage order", { exact: true }).selectOption(field(2));
      await page.getByLabel("Stage value", { exact: true }).selectOption(field(1));
    } else {
      for (const [index, column] of (kind === "table_rollup" ? [0, 2] : [3, 0]).entries()) {
        await page.getByRole("button", { name: "Add grouping level", exact: true }).click();
        await page.getByLabel(`Rollup dimension ${index + 1}`, { exact: true }).selectOption(field(column));
      }
      for (const [index, operation] of (kind === "table_rollup" ? ["sum", "average", "ratio_of_sums"] : ["sum"]).entries()) {
        await page.getByRole("button", { name: "Add rollup measure", exact: true }).click();
        await page.getByLabel(`Rollup measure name ${index + 1}`, { exact: true }).fill(["Revenue", "Mean", "Attainment"][index]);
        await page.getByLabel(`Rollup operation ${index + 1}`, { exact: true }).selectOption(operation);
        await page.getByLabel(`Rollup value ${index + 1}`, { exact: true }).selectOption(field(1));
        if (operation === "ratio_of_sums") await page.getByLabel(`Rollup denominator ${index + 1}`, { exact: true }).selectOption(field(3));
      }
    }
    await expectFormFits(page);
    await page.reload();
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Analysis type", exact: true })).toHaveValue(kind);
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeEnabled();
    await expectFormFits(page);
    expect((await (await request.get(`${root}/workflows`)).json()).items).toHaveLength(0);
    const checkResult = async () => {
      if (kind === "heatmap_stats") {
        await page.getByRole("button", { name: "Cell table", exact: true }).click();
        await expect(page.getByRole("cell", { name: "Missing measure", exact: true })).toHaveCount(1);
        await expect(page.getByRole("cell", { name: "No source rows", exact: true })).toHaveCount(1);
        await expect(page.getByRole("cell", { name: "Observed value", exact: true })).toHaveCount(2);
      } else if (kind === "table_rollup") {
        const total = page.getByTestId("analytical-table").getByRole("row").filter({ has: page.getByRole("rowheader", { name: "Grand total Source rows: 4", exact: true }) });
        await expect(total.getByRole("cell", { name: "30.00", exact: true })).toBeVisible();
        await expect(total.getByRole("cell", { name: "10.000000", exact: true })).toBeVisible();
        await expect(total.getByRole("cell", { name: "1.000000", exact: true })).toBeVisible();
      } else {
        await page.getByRole("button", { name: "Data table", exact: true }).click();
        const hierarchy = kind === "treemap_chart" || kind === "sunburst_chart";
        await expect(page.getByRole("cell", { name: hierarchy ? "160.00" : "100.00", exact: true }).first()).toBeVisible();
        await expect(page.getByRole("cell", { name: "20.00", exact: true }).first()).toBeVisible();
        if (hierarchy) {
          await page.getByRole("row", { name: /North/ }).getByRole("button", { name: "Open group", exact: true }).click();
          await expect(page.getByRole("cell", { name: "100.00", exact: true }).first()).toBeVisible();
          await page.getByRole("button", { name: "Parent group", exact: true }).click();
        }
      }
    };
    await checkResult();
    await page.screenshot({ path: testInfo.outputPath(`${kind}-populated.png`), fullPage: true });
    if (layout === "desktop") {
      await page.setViewportSize({ width: 760, height: 1000 });
      await page.screenshot({ path: testInfo.outputPath(`${kind}-narrow.png`), fullPage: true });
      await page.setViewportSize({ width: 1600, height: 1000 });
    }
    const bodies: string[] = [];
    await page.route("**/statistical-reports/apply", async route => {
      bodies.push(route.request().postData()!);
      if (bodies.length === 1) { expect((await route.fetch()).ok()).toBeTruthy(); await route.abort("connectionreset"); }
      else await route.continue();
    });
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await expect(page.getByRole("button", { name: "Retry report save", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Retry report save", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Report is ready", exact: true })).toBeVisible();
    expect(bodies).toHaveLength(2); expect(bodies[1]).toBe(bodies[0]);
    const workflows = (await (await request.get(`${root}/workflows`)).json()).items;
    expect(workflows).toHaveLength(1);
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflows[0].id}`)).json();
    expect(graph.nodes.map((node: { type: string }) => node.type)).toEqual(["dataset_source", kind.endsWith("_chart") ? "table_rollup" : kind]);
    expect(graph.nodes[1].config).toEqual(Object.fromEntries(Object.entries(JSON.parse(bodies[0]).analysis).filter(([key]) => key !== "type")));
    expect((await (await request.get(`${root}/visualizations`)).json()).items).toHaveLength(1);
    expect((await (await request.get(`${root}/dashboards`)).json()).items).toHaveLength(1);
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\?/);
    await checkResult();
    await page.reload();
    await checkResult();
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${root}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
