import { expect, test } from "@playwright/test";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
test("typed input diagnostics survive API and appear in the inspector in three languages", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Field diagnostics" } })).json();
  try {
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Diagnostics" } })).json();
    const nodes = [
      { id: crypto.randomUUID(), type: "scalar_constant", version: 1, position: { x: 0, y: 0 }, config: { value: true } },
      { id: crypto.randomUUID(), type: "scalar_constant", version: 1, position: { x: 0, y: 220 }, config: { value: "text" } },
      { id: crypto.randomUUID(), type: "field_logical", version: 1, position: { x: 400, y: 0 }, config: { operation: "and" }, ui: { label: "Invalid logic" } },
    ];
    const edges = ["a", "b"].map((port, index) => ({ id: crypto.randomUUID(), source_node_id: nodes[index].id, source_port: "value", target_node_id: nodes[2].id, target_port: port }));
    const path = `${api}/api/v1/workflows/${workflow.id}`;
    expect((await request.put(path, { data: { name: workflow.name, expected_revision: workflow.revision, format_version: 2, nodes, edges } })).ok()).toBe(true);
    const schema = await (await request.get(`${path}/schema`)).json();
    expect(schema.issues).toContainEqual(expect.objectContaining({ code: "INVALID_TYPED_NODE", node_id: nodes[2].id, edge_id: edges[1].id, field: "b" }));
    await page.goto(`/projects/${project.id}/workflow?workflow=${workflow.id}&mode=fields`);
    await page.getByLabel("Edit workflow node", { exact: true }).selectOption(nodes[2].id);
    for (const [locale, expected] of [["en", "Input: b"], ["ru", "Вход: b"], ["tt", "Кереш: b"]]) {
      await page.locator("#interface-language").selectOption(locale);
      await expect(page.getByText(expected, { exact: false }).filter({ hasText: "INVALID_TYPED_NODE" })).toBeVisible();
    }
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
