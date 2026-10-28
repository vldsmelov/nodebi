import { test, expect, request as createRequest } from "@playwright/test";
import { expectTooltipContrast } from "./tooltip-contrast";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("eight-axis radar tooltip retains every exact value in small widgets and narrow themes", async ({ page, request }, testInfo) => {
  test.setTimeout(120000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Eight-axis tooltip acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "profiles.csv", mimeType: "text/csv", buffer: Buffer.from("profile,a,b,c,d,e,f,g,h\nNorth_Regional_Manufacturing_Operations_Division_001,3,4,5,6,7,8,9,2\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Eight axes", dimensions: [profile.fields[0].field_id], measures: [{ name: "Value", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json(), url = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(url)).json();
    graph.result_catalog.outputs[0].node_id = graph.nodes.find((node: { type: string }) => node.type === "dataset_source").id;
    expect((await request.put(url, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await page.getByRole("combobox", { name: "Visualization type", exact: true }).selectOption("radar_chart");
    await page.getByLabel("Radar profile", { exact: true }).selectOption(profile.fields[0].field_id);
    for (let index = 1; index <= 8; index++) {
      if (index > 3) await page.getByRole("button", { name: "Add radar axis", exact: true }).click();
      await page.getByLabel(`Radar axis ${index}`, { exact: true }).selectOption(profile.fields[index].field_id);
    }
    await page.getByLabel("Radar normalization", { exact: true }).selectOption("shared");
    await page.getByLabel("Radar minimum", { exact: true }).fill("0");
    await page.getByLabel("Radar maximum", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Apply visualization", exact: true }).click();
    for (const width of [1600, 420]) for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator("select").filter({ has: page.locator('option[value="dark"]') }).selectOption(theme);
      const canvas = page.getByRole("img", { name: "Eight axes", exact: true }).locator("canvas").first();
      await expect(canvas).toBeVisible();
      await canvas.scrollIntoViewIfNeeded();
      const bounds = (await canvas.boundingBox())!;
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height * 0.46 - Math.min(bounds.width, bounds.height) * 0.275 * 0.3);
      const tooltip = page.getByRole("tooltip");
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText("North_Regional_Manufacturing_Operations_Division_001");
      for (const [axis, value] of [["a", 3], ["b", 4], ["c", 5], ["d", 6], ["e", 7], ["f", 8], ["g", 9], ["h", 2]]) await expect(tooltip).toContainText(`${axis}: ${value}`);
      await expectTooltipContrast(tooltip);
      const box = (await tooltip.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(1000);
      await page.screenshot({ path: testInfo.outputPath(`radar-eight-${width}-${theme}.png`), animations: "disabled" });
      await page.mouse.move(0, 0);
    }
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
