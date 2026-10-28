import { test, expect, request as createRequest } from "@playwright/test";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const layout of ["desktop", "narrow", "large-text"]) for (const kind of ["histogram", "boxplot_stats"] as const) test(`guided ${kind} report previews, restores, saves once and survives reload (${layout})`, async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  page.on("dialog", dialog => dialog.accept());
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: `Guided ${kind}` } })).json();
  const root = `${api}/api/v1/projects/${project.id}`;
  if (layout !== "desktop") await page.setViewportSize({ width: layout === "narrow" ? 420 : 1280, height: 1000 });
  if (layout === "large-text") await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => { document.documentElement.style.fontSize = "32px"; });
  });
  const verifyForm = async () => {
    const controls = page.locator("main input:visible, main select:visible, main textarea:visible, main button:visible");
    expect(await controls.count()).toBeGreaterThan(5);
    for (const control of await controls.all()) {
      await control.scrollIntoViewIfNeeded();
      const bounds = (await control.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  };
  try {
    const values = kind === "histogram" ? "group,value\nA,1.00\nA,2.00\nA,3.00\nA,4.00\nA,100.00\nB,\n" : "group,value\n" + "A,0.00\n".repeat(1000) + "A,100.00\n".repeat(150) + "B,999.00\n";
    const source = await (await request.post(`${root}/imports`, { multipart: { connector: "csv", file: { name: "Observations.csv", mimeType: "text/csv", buffer: Buffer.from(values) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    await page.goto(`/projects/${project.id}/build`);
    await page.getByRole("link", { name: "Create analytical report", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Create analytical report", exact: true })).toBeVisible();
    await page.getByLabel("Report name", { exact: true }).fill("Distribution report");
    await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption(snapshot.id);
    await page.getByRole("combobox", { name: "Analysis type", exact: true }).selectOption(kind);
    await page.getByLabel("Distribution value", { exact: true }).selectOption(profile.fields[1].field_id);
    if (kind === "histogram") {
      await page.getByLabel("Interval count", { exact: true }).fill("2");
      await page.getByLabel("Set histogram range", { exact: true }).check();
      await page.getByLabel("Histogram upper bound", { exact: true }).fill("4");
    } else {
      await page.getByLabel("Distribution grouping", { exact: true }).selectOption(profile.fields[0].field_id);
      await page.getByText("Filters before statistics", { exact: false }).click();
      await page.getByRole("button", { name: "Add filter", exact: true }).click();
      await page.getByLabel("Value", { exact: true }).fill("A");
    }
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    await expect(page.getByRole("img", { name: "Distribution report", exact: true }).locator("canvas")).toBeVisible();
    await verifyForm();
    if (layout !== "desktop") {
      const settings = (await page.getByRole("group", { name: "Data and calculation", exact: true }).boundingBox())!;
      const preview = (await page.getByRole("region", { name: "Report preview", exact: true }).boundingBox())!;
      expect(preview.y).toBeGreaterThanOrEqual(settings.y + settings.height);
      expect(preview.width).toBeGreaterThanOrEqual(settings.width - 1);
    }
    expect((await (await request.get(`${root}/workflows`)).json()).items).toHaveLength(0);
    if (kind === "histogram") {
      await expect(page.getByText("Included: 4. Missing: 1. Below range: 0. Above range: 1.")).toBeVisible();
      await page.getByRole("button", { name: "Histogram intervals", exact: true }).click();
      await expect(page.getByRole("cell", { name: "[2; 4]", exact: true })).toBeVisible();
    } else {
      await expect(page.getByText("Showing 100 of 150 outliers. Statistics are unchanged.")).toBeVisible();
      await page.getByRole("button", { name: "Outliers", exact: true }).click();
      await page.getByRole("button", { name: "Next page", exact: true }).click();
      await expect(page.getByText("Showing 50 of 150 outliers. Statistics are unchanged.")).toBeVisible();
      await expect(page.getByRole("button", { name: "Outliers", exact: true })).toHaveAttribute("aria-pressed", "true");
    }
    await page.reload();
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await expect(page.getByLabel("Report name", { exact: true })).toHaveValue("Distribution report");
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeEnabled();
    await verifyForm();
    let lastFrame = "", stableFrames = 0;
    await expect.poll(async () => {
      const frame = await page.getByRole("img", { name: "Distribution report", exact: true }).locator("canvas").evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
      stableFrames = frame === lastFrame ? stableFrames + 1 : 0; lastFrame = frame;
      return stableFrames;
    }, { intervals: [100] }).toBeGreaterThanOrEqual(3);
    await page.screenshot({ path: testInfo.outputPath(`${kind}-wizard.png`), fullPage: true, animations: "disabled" });
    if (kind === "boxplot_stats" && layout === "desktop") {
      await page.setViewportSize({ width: 760, height: 1000 });
      await page.screenshot({ path: testInfo.outputPath("statistics-narrow.png"), fullPage: true, animations: "disabled" });
      await page.setViewportSize({ width: 1600, height: 1000 });
    }
    const bodies: string[] = [];
    await page.route("**/statistical-reports/apply", async route => {
      bodies.push(route.request().postData()!);
      if (bodies.length === 1) { const committed = await route.fetch(); expect(committed.ok()).toBeTruthy(); await route.abort("connectionreset"); }
      else await route.continue();
    });
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await expect(page.getByRole("button", { name: "Retry report save", exact: true })).toBeEnabled();
    const workflows = (await (await request.get(`${root}/workflows`)).json()).items;
    expect(workflows).toHaveLength(1);
    const graphUrl = `${api}/api/v1/workflows/${workflows[0].id}`;
    const graph = await (await request.get(graphUrl)).json();
    expect(graph.nodes.map((n: { type: string }) => n.type)).toEqual(kind === "histogram" ? ["dataset_source", "histogram"] : ["dataset_source", "filter", "boxplot_stats"]);
    await page.route("**/datasets", route => route.abort("connectionreset"));
    await page.reload();
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Pending report save", exact: true })).toBeFocused();
    await page.keyboard.press("Tab"); await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Report is ready", exact: true })).toBeFocused();
    expect(bodies).toHaveLength(2); expect(bodies[1]).toBe(bodies[0]);
    expect(await (await request.get(graphUrl)).json()).toEqual(graph);
    expect((await (await request.get(`${root}/visualizations`)).json()).items).toHaveLength(1);
    expect((await (await request.get(`${root}/dashboards`)).json()).items).toHaveLength(1);
    await page.unroute("**/datasets");
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\?/);
    await expect(page.getByRole("img", { name: "Distribution report", exact: true }).locator("canvas")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("img", { name: "Distribution report", exact: true }).locator("canvas")).toBeVisible();
    if (kind === "histogram") await expect(page.getByText("Included: 4. Missing: 1. Below range: 0. Above range: 1.")).toBeVisible();
    else await expect(page.getByText("Showing 100 of 150 outliers. Statistics are unchanged.")).toBeVisible();
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${root}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});

test("guided distribution reuses a prepared result without copying its calculation", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Prepared distribution" } })).json();
  const root = `${api}/api/v1/projects/${project.id}`;
  try {
    const source = await (await request.post(`${root}/imports`, { multipart: { connector: "csv", file: { name: "Departments.csv", mimeType: "text/csv", buffer: Buffer.from("department,value\nA,1.00\nA,2.00\nB,4.00\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const built = await request.post(`${root}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Department totals", dimensions: [profile.fields[0].field_id], measures: [{ name: "Total", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(built.ok()).toBeTruthy(); const ids = await built.json();
    const graphUrl = `${api}/api/v1/workflows/${ids.workflow_id}`, before = await (await request.get(graphUrl)).json();
    const oldVisual = await (await request.get(`${api}/api/v1/visualizations/${ids.visualization_id}`)).json();
    await page.goto(`/projects/${project.id}/build?statistics=1`);
    await page.getByLabel("Report name", { exact: true }).fill("Spread of department totals");
    await page.getByRole("combobox", { name: "Report data source", exact: true }).selectOption("publication");
    await page.getByRole("combobox", { name: "Prepared calculation result", exact: true }).selectOption(`${ids.workflow_id}/${ids.publication_id}`);
    await page.getByRole("combobox", { name: "Analysis type", exact: true }).selectOption("boxplot_stats");
    await page.getByLabel("Distribution value", { exact: true }).selectOption({ label: "Total" });
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    await page.getByRole("button", { name: "Distribution summary", exact: true }).click();
    await expect(page.getByRole("cell", { name: "3.5000", exact: true })).toBeVisible();
    expect(await (await request.get(graphUrl)).json()).toEqual(before);
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Report is ready", exact: true })).toBeVisible();
    const after = await (await request.get(graphUrl)).json();
    expect(after.nodes.slice(0, before.nodes.length)).toEqual(before.nodes);
    expect(after.nodes).toHaveLength(before.nodes.length + 1);
    expect(after.edges.slice(0, before.edges.length)).toEqual(before.edges);
    expect(after.result_catalog.outputs[0]).toEqual(before.result_catalog.outputs[0]);
    expect(await (await request.get(`${api}/api/v1/visualizations/${ids.visualization_id}`)).json()).toEqual(oldVisual);
    expect((await (await request.get(`${root}/workflows`)).json()).items).toHaveLength(1);
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${root}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
