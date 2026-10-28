import { expect, test } from "@playwright/test";
import { contrastSamples } from "./computed-contrast";
import { activateByKeyboard, tabTo } from "./keyboard-navigation";

const api = process.env.NODEBI_E2E_API ?? "http://localhost:8020";

for (const theme of ["light", "dark"]) test(`report exact table and switch controls retain contrast and keyboard access in ${theme}`, async ({ page, request, context }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Report contrast" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "values.csv", mimeType: "text/csv", buffer: Buffer.from("region,amount\nNorth,50.123456\nSouth,150.123456\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    profile.fields[1].logical_type = "decimal"; profile.fields[1].precision = 24; profile.fields[1].scale = 6;
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Readable report", dimensions: [profile.fields[0].field_id], measures: [{ name: "Amount", operation: "sum", column_id: profile.fields[1].field_id }], presentation: "bar_chart" } });
    expect(created.ok()).toBeTruthy(); const ids = await created.json();
    const graph = await (await request.get(`${api}/api/v1/workflows/${ids.workflow_id}`)).json();
    await context.addCookies([{ name: "nodebi-theme", value: theme, domain: "localhost", path: "/" }]);
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${ids.dashboard_id}&mode=view`);
    const widget = page.locator("[data-widget-id]");
    await expect(widget.getByRole("img").locator("canvas")).toBeVisible();
    const tableButton = widget.getByRole("button", { name: "Data table", exact: true });
    await activateByKeyboard(page, tableButton);
    await expect(widget.getByRole("cell", { name: "50.123456", exact: true })).toBeVisible();
    await expect(widget.getByRole("cell", { name: "150.123456", exact: true })).toBeVisible();
    const samples = await contrastSamples(widget);
    expect(samples.length).toBeGreaterThan(5);
    expect(samples.filter(sample => sample.ratio < sample.minimum)).toEqual([]);
    await expect(tableButton).toHaveCSS("outline-style", "solid");
    for (const sample of await contrastSamples(tableButton, true)) expect(sample.ratio).toBeGreaterThanOrEqual(3);
    for (const name of ["Chart", "Data table"]) {
      const bounds = (await widget.getByRole("button", { name, exact: true }).boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(24); expect(bounds.height).toBeGreaterThanOrEqual(24);
    }
    await activateByKeyboard(page, widget.getByRole("button", { name: "Chart", exact: true }));
    await expect(widget.getByRole("img").locator("canvas")).toBeVisible();
    expect(await (await request.get(`${api}/api/v1/workflows/${ids.workflow_id}`)).json()).toEqual(graph);
  } finally { expect((await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
});

for (const theme of ["light", "dark"]) test(`pending table page has visible contrast and disabled navigation in ${theme}`, async ({ page, request, context }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Pending table page" } })).json();
  let release = () => {};
  try {
    const csv = "region,amount\n" + Array.from({ length: 201 }, (_, i) => `R${String(i).padStart(3, "0")},1\n`).join("");
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "pages.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const response = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Paged report", dimensions: [profile.fields[0].field_id], measures: [{ name: "Amount", operation: "sum", column_id: profile.fields[1].field_id }], presentation: "table" } });
    expect(response.ok()).toBeTruthy(); const ids = await response.json();
    await context.addCookies([{ name: "nodebi-theme", value: theme, domain: "localhost", path: "/" }]);
    await page.setViewportSize({ width: 420, height: 1000 });
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${ids.dashboard_id}&mode=view`);
    const widget = page.locator("[data-widget-id]");
    await expect(widget.getByRole("cell", { name: "R000", exact: true })).toBeVisible();
    const delayed = new Promise<void>(resolve => { release = resolve; });
    await page.route(`**/visualizations/${ids.visualization_id}/result*`, async route => { await delayed; await route.continue(); });
    const next = widget.getByRole("button", { name: "Next page", exact: true });
    await activateByKeyboard(page, next);
    const notice = widget.getByRole("status").filter({ hasText: "Showing previous result. Waiting for updated data." });
    await expect(notice).toBeVisible();
    await expect(next).toBeDisabled();
    await expect(widget.getByRole("button", { name: "Previous page", exact: true })).toBeDisabled();
    const samples = await contrastSamples(notice);
    expect(samples).toHaveLength(1);
    expect(samples[0].ratio).toBeGreaterThanOrEqual(samples[0].minimum);
    const bounds = (await notice.boundingBox())!, outer = (await widget.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(outer.x);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(outer.x + outer.width + 1);
    release();
    await expect(widget.getByRole("cell", { name: "R100", exact: true })).toBeVisible();
    await expect(notice).toHaveCount(0);
    await expect(next).toBeEnabled();
    await page.unroute(`**/visualizations/${ids.visualization_id}/result*`);
    await activateByKeyboard(page, widget.getByRole("button", { name: "Previous page", exact: true }));
    await expect(widget.getByRole("cell", { name: "R000", exact: true })).toBeVisible();
  } finally {
    release();
    expect((await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
  }
});

/** Computed sRGB colors, including alpha backgrounds. Unsupported paint fails explicitly. */

test("computed-color sampler preserves independent contrast and alpha oracles", async ({ page }) => {
  await page.setContent('<body style="background:white"><main><p style="color:black">Black</p><p style="color:white">White</p><p style="color:black;background:rgb(0 0 0 / .5)">Alpha</p><p style="color:oklab(0 0 0)">Oklab</p></main></body>');
  const samples = await contrastSamples(page.locator("main"));
  expect(samples.find(sample => sample.text === "Black")!.ratio).toBe(21);
  expect(samples.find(sample => sample.text === "White")!.ratio).toBe(1);
  expect(samples.find(sample => sample.text === "Alpha")!.ratio).toBeCloseTo(5.280822809644651, 10);
  expect(samples.find(sample => sample.text === "Oklab")!.ratio).toBe(21);
});

for (const theme of ["light", "dark"]) test(`overview computed contrast, focus and button targets in ${theme}`, async ({ page, request, context }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Rendered contrast acceptance" } })).json();
  try {
    await context.addCookies([{ name: "nodebi-theme", value: theme, domain: "localhost", path: "/" }]);
    await page.goto(`/projects/${project.id}`);
    await expect(page.getByText("Report has not been checked yet.", { exact: true })).toBeVisible();
    const checkText = async () => {
      const samples = await contrastSamples(page.getByRole("main"));
      expect(samples.length).toBeGreaterThan(15);
      expect(samples.filter(sample => sample.ratio < sample.minimum)).toEqual([]);
      for (const button of await page.getByRole("main").getByRole("button").all()) {
        const bounds = (await button.boundingBox())!;
        expect(bounds.width).toBeGreaterThanOrEqual(24);
        expect(bounds.height).toBeGreaterThanOrEqual(24);
      }
    };
    await checkText();
    const rename = page.getByRole("button", { name: "Rename project", exact: true });
    await tabTo(page, rename);
    await expect(rename).toHaveCSS("outline-style", "solid");
    await expect(rename).toHaveCSS("outline-width", "2px");
    for (const sample of await contrastSamples(rename, true)) expect(sample.ratio).toBeGreaterThanOrEqual(3);
    await page.route(`**/projects/${project.id}/report-state`, route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: { code: "UNAVAILABLE", message: "Temporarily unavailable." } }) }));
    await page.reload();
    await expect(page.getByRole("main").getByRole("alert")).toContainText("Its current state is unknown.", { timeout: 20000 });
    await checkText();
    await page.screenshot({ path: test.info().outputPath(`overview-contrast-${theme}.png`), fullPage: true });
  } finally { expect((await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
});
