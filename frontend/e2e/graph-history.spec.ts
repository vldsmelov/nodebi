import { expect, test } from "@playwright/test";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
test("undo a rejected visualization deletion without losing its dashboard widget", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Undo safety" } })).json();
  try {
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Widget safety" } })).json();
    const id = crypto.randomUUID();
    expect((await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: workflow.name, expected_revision: workflow.revision, nodes: [{ id, type: "kpi", version: 1, config: {}, ui: {}, position: { x: 0, y: 0 } }], edges: [] } })).ok()).toBe(true);
    const dashboard = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Keep this widget" } })).json();
    const response = await request.put(`${api}/api/v1/dashboards/${dashboard.id}`, { data: { name: dashboard.name, expected_revision: dashboard.revision, widgets: [{ id: crypto.randomUUID(), visualization_id: id, x: 0, y: 0, width: 6, height: 4, config: {} }] } });
    expect(response.ok(), await response.text()).toBe(true); const baseline = await response.json();
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByLabel("Edit workflow node").selectOption(id);
    await page.getByRole("button", { name: "Delete selected node", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Remove this visualization from dashboards" })).toBeVisible();
    expect(await (await request.get(`${api}/api/v1/dashboards/${dashboard.id}`)).json()).toEqual(baseline);
    await page.getByRole("button", { name: "Undo graph change", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await expect(page.locator(`.react-flow__node[data-id="${id}"]`)).toHaveCount(1);
    expect(await (await request.get(`${api}/api/v1/dashboards/${dashboard.id}`)).json()).toEqual(baseline);
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});

test("undo and redo compound graph edits, field sessions and layout with persistent revisions", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Graph history acceptance" } })).json();
  try {
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "History" } })).json();
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    const nodes = ids.map((id, index) => ({ id, type: "calculated_column", version: 1, position: { x: index * 120, y: index * 400 }, config: { name: `Field ${index}`, expression: "1" }, ui: {} }));
    expect((await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: workflow.name, nodes, edges: [], parameters: [], expected_revision: workflow.revision } })).ok()).toBe(true);
    const read = async () => (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    const byId = (items: { id: string }[]) => [...items].sort((a, b) => a.id.localeCompare(b.id));
    const saved = () => expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.goto(`/projects/${project.id}/workflow`);
    await expect(page.getByRole("button", { name: "Undo graph change", exact: true })).toBeDisabled();
    await page.getByLabel("Edit workflow node").selectOption(ids[0]);
    await page.getByLabel("Add next step", { exact: true }).selectOption({ label: "Filter" }); await saved();
    const added = await read(), next = added.nodes.find((node: { id: string }) => !ids.includes(node.id));
    await page.getByRole("button", { name: "Undo graph change", exact: true }).click(); await saved();
    expect((await read()).nodes).toHaveLength(2); expect((await read()).edges).toHaveLength(0);
    await page.getByRole("button", { name: "Redo graph change", exact: true }).click(); await saved();
    expect((await read()).edges).toEqual(added.edges);
    await page.getByLabel("Edit workflow node").selectOption(next.id);
    await page.getByLabel("Node label", { exact: true }).fill("First");
    await page.getByLabel("Node label", { exact: true }).fill("Finished label"); await saved();
    await page.getByRole("button", { name: "Undo graph change", exact: true }).click(); await saved();
    await expect(page.getByLabel("Node label", { exact: true })).toHaveValue("");
    await page.getByRole("button", { name: "Redo graph change", exact: true }).click(); await saved();
    const beforeLayout = await read();
    await page.getByRole("button", { name: "Arrange by dependencies", exact: true }).click(); await saved();
    const arranged = await read();
    await page.screenshot({ path: "../.backups/ux-layout.png" });
    expect(arranged.nodes.find((node: { id: string }) => node.id === next.id).position.x).toBeGreaterThan(arranged.nodes.find((node: { id: string }) => node.id === ids[0]).position.x);
    expect(arranged.edges).toEqual(beforeLayout.edges);
    await page.getByRole("button", { name: "Undo graph change", exact: true }).click(); await saved();
    expect(byId((await read()).nodes)).toEqual(byId(beforeLayout.nodes));
    await page.getByLabel("Edit workflow node").selectOption(next.id);
    await page.getByRole("button", { name: "Delete selected node", exact: true }).click(); await saved();
    expect((await read()).nodes).toHaveLength(2);
    await page.getByRole("button", { name: "Undo graph change", exact: true }).click(); await saved();
    expect(byId((await read()).nodes)).toEqual(byId(beforeLayout.nodes));
    expect((await read()).edges).toEqual(beforeLayout.edges);
    await page.reload();
    await expect(page.getByRole("button", { name: "Undo graph change", exact: true })).toBeDisabled();
    await page.getByLabel("Edit workflow node").selectOption(next.id);
    await expect(page.getByLabel("Node label", { exact: true })).toHaveValue("Finished label");
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
