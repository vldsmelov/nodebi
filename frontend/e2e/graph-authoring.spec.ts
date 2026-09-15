import { expect, test } from "@playwright/test";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
test("name nodes, trace dependencies, append a step and replace its input atomically", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Graph authoring UX" } })).json();
  try {
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Authoring" } })).json();
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    const nodes = ids.map((id, index) => ({ id, type: "calculated_column", version: 1, position: { x: 0, y: index * 250 }, config: { name: `Value ${index}`, expression: "1" }, ui: {} }));
    const saved = await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: workflow.name, nodes, edges: [], parameters: [], expected_revision: workflow.revision } });
    expect(saved.ok()).toBeTruthy();
    const read = async () => (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByLabel("Edit workflow node").selectOption(ids[0]);
    await page.getByLabel("Node label", { exact: true }).fill("Prepared services");
    await page.getByLabel("Add next step", { exact: true }).selectOption("filter");
    await expect(page.locator(".react-flow__node")).toHaveCount(3);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const appended = await read(), added = appended.nodes.find((node: { id: string }) => !ids.includes(node.id));
    expect(appended.edges).toHaveLength(1);
    expect(appended.edges[0]).toMatchObject({ source_node_id: ids[0], target_node_id: added.id });
    expect(appended.nodes.find((node: { id: string }) => node.id === ids[0]).ui.label).toBe("Prepared services");
    await expect(page.locator(`.react-flow__node[data-id="${ids[0]}"]`)).toContainText("Prepared services");
    await page.getByLabel("Show dependencies", { exact: true }).selectOption("ancestors");
    await expect(page.locator(`.react-flow__node[data-id="${ids[1]}"]`)).toHaveCSS("opacity", "0.2");
    await page.getByLabel("Show dependencies", { exact: true }).selectOption("all");
    expect((await read()).revision).toBe(appended.revision);
    const writes: { edges: { source_node_id: string }[] }[] = [];
    page.on("request", req => { if (req.method() === "PUT" && req.url().endsWith(`/workflows/${workflow.id}`)) writes.push(req.postDataJSON()); });
    await page.getByLabel("Input input", { exact: true }).selectOption(`${ids[1]}:dataset`);
    await expect.poll(async () => (await read()).edges[0].source_node_id).toBe(ids[1]);
    expect(writes.length).toBeGreaterThan(0);
    expect(writes.every(write => write.edges.length === 1 && write.edges[0].source_node_id === ids[1])).toBe(true);
    await page.reload();
    await page.getByLabel("Edit workflow node").selectOption(ids[0]);
    await expect(page.getByLabel("Node label", { exact: true })).toHaveValue("Prepared services");
    await expect(page.getByLabel("Output field name", { exact: true })).toHaveValue("Value 0");
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
