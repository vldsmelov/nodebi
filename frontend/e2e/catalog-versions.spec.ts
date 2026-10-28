import { expect, test } from "@playwright/test";
import type { NodeDefinition } from "../features/workflow/types";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("a newer catalog contract does not change saved node ports or inspector bindings", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Catalog version regression" } })).json();
  try {
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Versions" } })).json();
    const path = `${api}/api/v1/workflows/${workflow.id}`;
    const nodes = [
      { id: crypto.randomUUID(), type: "scalar_constant", version: 1, config: { value: 7 }, position: { x: 0, y: 0 }, ui: { label: "Amount" } },
      { id: crypto.randomUUID(), type: "field_arithmetic", version: 1, config: { operation: "add" }, position: { x: 360, y: 0 }, ui: { label: "Double" } },
    ];
    const edges = ["a", "b"].map(port => ({ id: crypto.randomUUID(), source_node_id: nodes[0].id, source_port: "value", target_node_id: nodes[1].id, target_port: port }));
    const saved = await request.put(path, { data: { name: workflow.name, format_version: 2, expected_revision: workflow.revision, nodes, edges } });
    expect(saved.ok()).toBe(true);
    const revision = (await saved.json()).revision;
    // Test-only v99 precedes real versions and uses incompatible handles.
    // Do not shadow production v2 or persist/execute the invented contract.
    await page.route("**/api/v1/node-catalog?format_version=2", async route => {
      const response = await route.fetch();
      const body = await response.json();
      const newer = body.items.filter((item: NodeDefinition) => item.version === 1 && ["scalar_constant", "field_arithmetic"].includes(item.type)).map((item: NodeDefinition) => ({ ...item, version: 99, input_ports: item.input_ports.map(port => ({ ...port, id: `new_${port.id}` })), output_ports: item.output_ports.map(port => ({ ...port, id: "new_value" })) }));
      await route.fulfill({ response, json: { ...body, items: [...newer, ...body.items] } });
    });
    await page.goto(`/projects/${project.id}/workflow?workflow=${workflow.id}&mode=fields`);
    await expect(page.getByRole("button", { name: "+ Field arithmetic · v1", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Field arithmetic · v99", exact: true })).toBeVisible();
    await page.locator(`.react-flow__node[data-id="${nodes[1].id}"]`).click();
    await expect(page.getByLabel("Input a", { exact: true })).toHaveValue(JSON.stringify([nodes[0].id, "value"]));
    await expect(page.getByLabel("Input b", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Input new_a", { exact: true })).toHaveCount(0);
    expect((await (await request.post(`${path}/nodes/${nodes[1].id}/preview`, { data: {} })).json()).rows[0].value).toBe(14);
    expect((await (await request.get(path)).json()).revision).toBe(revision);
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
