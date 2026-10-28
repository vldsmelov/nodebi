import { test, expect, request as createRequest } from "@playwright/test";
import { configureFormLayout, expectFormFits, formLayouts } from "./form-reflow";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const mode of ["graph", "wizard"] as const) for (const layout of mode === "wizard" ? formLayouts : ["desktop"] as const) {
test(`alignment ${mode} controls persist and show whole-input unmatched counts (${layout})`, async ({ page, request }) => {
  test.setTimeout(120_000);
  await configureFormLayout(page, layout);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Alignment acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from("category,amount\nA,0.10\nA,0.20\nB,0.50\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Alignment", dimensions: [profile.fields[0].field_id], measures: [{ name: "Revenue", operation: "sum", column_id: profile.fields[1].field_id }] } });
    expect(created.ok()).toBeTruthy();
    const ids = await created.json();
    const workflowUrl = `${api}/api/v1/workflows/${ids.workflow_id}`;
    const graph = await (await request.get(workflowUrl)).json();
    const group = graph.nodes.find((node: { type: string }) => node.type === "group_by");
    const visual = await (await request.get(`${api}/api/v1/visualizations/${ids.visualization_id}`)).json();
    const key = profile.fields[0].field_id, value = visual.config.value_column_id;
    const filter = { id: crypto.randomUUID(), type: "filter", version: 1, position: { x: 550, y: 200 }, config: { conditions: [{ column_id: key, operator: "equals", value: "A" }] } };
    const align = { id: crypto.randomUUID(), type: "align_measures", version: 1, position: { x: 800, y: 100 }, config: { keys: [{ left_key: key, right_key: key }], left_value: value, right_value: value, left_name: "Actual", right_name: "Plan" } };
    const rightPublication = crypto.randomUUID();
    graph.nodes.push(filter);
    if (mode === "graph") graph.nodes.push(align);
    else graph.result_catalog.outputs.push({ id: rightPublication, name: "Plan", node_id: filter.id, port: "dataset", kind: "dataset" });
    const edges = mode === "graph" ? [[group.id, filter.id, "input"], [group.id, align.id, "left"], [filter.id, align.id, "right"]] : [[group.id, filter.id, "input"]];
    for (const [from, to, port] of edges) {
      graph.edges.push({ id: crypto.randomUUID(), source_node_id: from, source_port: "dataset", target_node_id: to, target_port: port });
    }
    expect((await request.put(workflowUrl, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, presentation: graph.presentation, result_catalog: graph.result_catalog, format_version: 3, expected_revision: graph.revision } })).ok()).toBeTruthy();
    if (mode === "wizard") {
      const before = await (await request.get(workflowUrl)).json();
      await page.goto(`/projects/${project.id}/build`);
      await page.getByRole("link", { name: "Create alignment report", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Create alignment report", exact: true })).toBeVisible();
      await page.getByLabel("Report name", { exact: true }).fill("Aligned report");
      await page.getByRole("combobox", { name: "Calculation graph", exact: true }).selectOption(ids.workflow_id);
      await page.getByRole("combobox", { name: "Left prepared result", exact: true }).selectOption(ids.publication_id);
      await page.getByRole("combobox", { name: "Right prepared result", exact: true }).selectOption(rightPublication);
      await page.getByLabel("Left key", { exact: true }).selectOption(key);
      await page.getByLabel("Right key", { exact: true }).selectOption(key);
      await page.getByRole("combobox", { name: "Left measure", exact: true }).selectOption(value);
      await page.getByRole("combobox", { name: "Right measure", exact: true }).selectOption(value);
      await expectFormFits(page);
      await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
      await expect(page.getByText("Full alignment: 1 matched, 1 only left, 0 only right. Counts cover all rows.")).toBeVisible();
      await expectFormFits(page);
      await page.screenshot({ path: test.info().outputPath("alignment-settings.png"), fullPage: true });
      expect((await (await request.get(workflowUrl)).json()).nodes).toEqual(before.nodes);
      await page.getByRole("button", { name: "Save report", exact: true }).click();
      await page.getByRole("link", { name: "Open report", exact: true }).click();
      await expect(page.getByRole("cell", { name: "0.50", exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByRole("cell", { name: "0.50", exact: true })).toBeVisible();
      const saved = await (await request.get(workflowUrl)).json();
      expect(saved.nodes.slice(0, -1)).toEqual(before.nodes);
      expect(saved.edges.slice(0, -2)).toEqual(before.edges);
      expect(saved.nodes.at(-1).type).toBe("align_measures");
      return;
    }
    await page.goto(`/projects/${project.id}/workflow?workflow=${ids.workflow_id}&node=${align.id}`);
    await expect(page.getByRole("combobox", { name: "Left measure", exact: true })).toHaveValue(value);
    await expect(page.getByLabel("Expected relationship", { exact: true })).toBeDisabled();
    await expect(page.getByRole("combobox", { name: "Empty alignment keys", exact: true })).toHaveValue("reject");
    await page.getByLabel("Left measure name", { exact: true }).fill("Actual revenue");
    await page.getByRole("combobox", { name: "Empty alignment keys", exact: true }).selectOption("match");
    await expect.poll(async () => (await (await request.get(workflowUrl)).json()).nodes.find((node: { id: string }) => node.id === align.id).config.null_keys).toBe("match");
    await page.reload();
    await expect(page.getByLabel("Left measure name", { exact: true })).toHaveValue("Actual revenue");
    await expect(page.getByRole("combobox", { name: "Empty alignment keys", exact: true })).toHaveValue("match");
    await page.getByRole("button", { name: "Pin A", exact: true }).click();
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.getByText("Full alignment: 1 matched, 1 only left, 0 only right. Counts cover all rows.")).toBeVisible();
    await expect(page.getByRole("cell", { name: "0.50", exact: true })).toBeVisible();
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
}
