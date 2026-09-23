import { showAllOperations } from "./operation-catalog";
import { expect, test } from "@playwright/test";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("v1 editor cannot overwrite v2 and retains its rejected draft", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Format guard" } })).json();
  try {
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Main" } })).json();
    const path = `${api}/api/v1/workflows/${workflow.id}`;
    const nodes = [0, 1].map(index => ({ id: crypto.randomUUID(), type: "select_columns", version: 1, position: { x: index * 310, y: 0 }, config: {}, ui: {} }));
    const edges = [{ id: crypto.randomUUID(), source_node_id: nodes[0].id, source_port: "dataset", source_column_id: "stable-field", target_node_id: nodes[1].id, target_port: "input" }];
    const presentation = { blocks: [{ id: crypto.randomUUID(), label: "Saved block", node_ids: nodes.map(node => node.id), position: { x: 0, y: 0 }, collapsed: true, inputs: [], outputs: [] }], workbooks: [] };
    const upgrade = await request.put(path, { data: { name: "Main", expected_revision: workflow.revision, format_version: 2, nodes, edges, presentation } });
    expect(upgrade.ok()).toBe(true);
    const saved = await upgrade.json();
    expect(saved.edges).toEqual(edges);
    expect(saved.presentation).toEqual({ ...presentation, results: [] });
    await page.goto(`/projects/${project.id}/workflow`);
    await showAllOperations(page); await page.getByTitle("Add Select Columns").click();
    await expect(page.getByRole("alert").filter({ hasText: "supports its format" })).toBeVisible();
    expect(await (await request.get(path)).json()).toEqual(saved);
    const pending = await page.evaluate(id => JSON.parse(sessionStorage.getItem(`nodebi:workflow-draft:${id}`)!).draft, workflow.id);
    expect(pending.format_version).toBe(1);
    expect(pending.nodes).toHaveLength(3);
    await page.reload();
    await expect(page.locator(".react-flow__node")).toHaveCount(3);
    await expect(page.getByRole("alert").filter({ hasText: "supports its format" })).toBeVisible();
    expect(await (await request.get(path)).json()).toEqual(saved);
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
