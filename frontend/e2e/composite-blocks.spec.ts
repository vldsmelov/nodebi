import { expect, test } from "@playwright/test";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
const byId = (items: { id: string }[]) => [...items].sort((a, b) => a.id.localeCompare(b.id));

test("pack, connect, edit, undo and restore a composite without replacing calculation identities", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Composite acceptance" } })).json();
  try {
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Blocks" } })).json();
    const path = `${api}/api/v1/workflows/${workflow.id}`;
    const nodes = [
      { id: crypto.randomUUID(), type: "scalar_constant", config: { value: 2 }, label: "Quantity" },
      { id: crypto.randomUUID(), type: "scalar_constant", config: { value: 3 }, label: "Price" },
      { id: crypto.randomUUID(), type: "field_arithmetic", config: { operation: "multiply" }, label: "Revenue" },
      { id: crypto.randomUUID(), type: "field_arithmetic", config: { operation: "add" }, label: "Adjusted" },
      { id: crypto.randomUUID(), type: "field_arithmetic", config: { operation: "multiply" }, label: "Total" },
    ].map((node, index) => ({ id: node.id, type: node.type, config: node.config, ui: { label: node.label }, version: 1, position: { x: index * 360, y: index % 2 * 300 } }));
    const edges = [[0, 2, "a"], [1, 2, "b"], [2, 3, "a"], [0, 3, "b"], [3, 4, "a"], [0, 4, "b"]].map(([source, target, port]) => ({ id: crypto.randomUUID(), source_node_id: nodes[Number(source)].id, source_port: "value", target_node_id: nodes[Number(target)].id, target_port: String(port) }));
    expect((await request.put(path, { data: { name: workflow.name, expected_revision: workflow.revision, format_version: 2, nodes, edges } })).ok()).toBe(true);
    const value = async () => { const response = await request.post(`${path}/nodes/${nodes[4].id}/preview`, { data: {} }); expect(response.ok()).toBe(true); return (await response.json()).rows[0].value; };
    expect(await value()).toBe(16);
    await page.goto(`/projects/${project.id}/workflow?workflow=${workflow.id}&mode=fields`);
    await page.getByRole("button", { name: "Create composite block", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Create composite block" });
    await dialog.getByLabel("Block name", { exact: true }).fill("Revenue block");
    await dialog.getByLabel("Revenue", { exact: true }).check();
    await dialog.getByLabel("Adjusted", { exact: true }).check();
    await dialog.getByRole("button", { name: "Pack block", exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(4);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const packed = await (await request.get(path)).json();
    expect(packed.presentation.blocks).toHaveLength(1);
    const block = packed.presentation.blocks[0];
    expect(block.inputs).toHaveLength(3); expect(block.outputs).toHaveLength(1);
    expect(packed.nodes.map((node: { id: string }) => node.id).sort()).toEqual(nodes.map(node => node.id).sort());
    expect(packed.edges.map((edge: { id: string }) => edge.id).sort()).toEqual(edges.map(edge => edge.id).sort());
    expect(await value()).toBe(16);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(5);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(4);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.reload();
    const card = page.locator(".react-flow__node-compositeNode");
    await expect(card).toHaveCount(1);
    const input = block.inputs.find((port: { node_id: string; port: string }) => port.node_id === nodes[2].id && port.port === "b");
    await expect(page.getByText("Updating fields", { exact: true })).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath("composite-collapsed.png") });
    await page.locator(`.react-flow__node[data-id="${nodes[0].id}"] .react-flow__handle[data-handleid="value"]`).dragTo(card.locator(`.react-flow__handle[data-handleid="${input.id}"]`));
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await expect.poll(value).toBe(12);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    expect(await value()).toBe(16);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    expect(await value()).toBe(12);
    await card.getByRole("button", { name: "Open block", exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(6);
    await page.locator(`.react-flow__node[data-id="${nodes[2].id}"]`).getByRole("button", { name: "Show connections for Value", exact: true }).click();
    await page.getByRole("button", { name: "Expose block output", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const exposed = (await (await request.get(path)).json()).presentation.blocks[0];
    expect(exposed.outputs).toHaveLength(2);
    expect(exposed.outputs).toContainEqual(block.outputs[0]);
    await page.getByLabel("Edit workflow node", { exact: true }).selectOption(nodes[3].id);
    await page.getByLabel("Operation", { exact: true }).selectOption("subtract");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    expect(await value()).toBe(4);
    await page.getByRole("button", { name: /^Back to workflow/ }).click();
    await expect(card.getByRole("button", { name: "Open block", exact: true })).toBeVisible();
    await card.getByLabel("Block name", { exact: true }).fill("Adjusted revenue");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.reload();
    await expect(card.getByLabel("Block name", { exact: true })).toHaveValue("Adjusted revenue");
    expect(await value()).toBe(4);
    const beforeSettings = await (await request.get(path)).json();
    await card.getByRole("button", { name: "Edit block", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "Edit composite block", exact: true });
    await settings.getByLabel("Revenue", { exact: true }).uncheck();
    await settings.getByRole("button", { name: "Cancel", exact: true }).click();
    expect((await (await request.get(path)).json()).revision).toBe(beforeSettings.revision);
    await card.getByRole("button", { name: "Edit block", exact: true }).click();
    const outputs = settings.getByRole("region", { name: "Public outputs", exact: true });
    await expect(outputs.getByRole("button", { name: "Hide port", exact: true }).first()).toBeDisabled();
    await outputs.getByLabel("Public port name", { exact: true }).first().fill("Net revenue");
    await outputs.getByRole("button", { name: "Hide port", exact: true }).nth(1).click();
    await settings.getByLabel("Revenue", { exact: true }).uncheck();
    await settings.getByLabel("Total", { exact: true }).check();
    await settings.getByLabel("Port direction", { exact: true }).selectOption("outputs");
    await settings.getByLabel("Available endpoint", { exact: true }).selectOption({ label: "Total / Value" });
    await settings.getByRole("button", { name: "Expose port", exact: true }).click();
    await settings.getByLabel("Port direction", { exact: true }).selectOption("inputs");
    await settings.getByLabel("Available endpoint", { exact: true }).selectOption({ label: "Total / a" });
    await settings.getByRole("button", { name: "Expose port", exact: true }).click();
    await settings.getByRole("button", { name: "Apply block changes", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const configured = await (await request.get(path)).json();
    expect(configured.revision).toBe(beforeSettings.revision + 1);
    expect(configured.presentation.blocks[0].node_ids.sort()).toEqual([nodes[3].id, nodes[4].id].sort());
    expect(configured.presentation.blocks[0].outputs).toContainEqual({ ...block.outputs[0], label: "Net revenue" });
    expect(configured.presentation.blocks[0].outputs).toHaveLength(2);
    expect(configured.presentation.blocks[0].inputs).toContainEqual(expect.objectContaining({ node_id: nodes[4].id, port: "a", column_id: null }));
    expect(byId(configured.nodes)).toEqual(byId(beforeSettings.nodes)); expect(byId(configured.edges)).toEqual(byId(beforeSettings.edges));
    expect(await value()).toBe(4);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    expect((await (await request.get(path)).json()).presentation).toEqual(beforeSettings.presentation);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.reload();
    await expect(card.getByText(/^Net revenue/)).toBeVisible();
    expect(await value()).toBe(4);
    for (const [locale, open] of [["ru", "Открыть блок"], ["tt", "Блокны ачарга"], ["en", "Open block"]]) {
      await page.locator("#interface-language").selectOption(locale);
      await expect(card.getByRole("button", { name: open, exact: true })).toBeVisible();
    }
    for (const theme of ["light", "dark"]) {
      await page.locator("#interface-theme").selectOption(theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(card).toBeVisible();
    }
    const beforeMove = await (await request.get(path)).json();
    await page.getByText("Move without dragging", { exact: true }).click();
    await page.getByLabel("Layout item", { exact: true }).selectOption(`block:${block.id}`);
    await page.getByRole("button", { name: "Move item down", exact: true }).click();
    await expect.poll(async () => (await (await request.get(path)).json()).presentation.blocks[0].position.y).toBe(beforeMove.presentation.blocks[0].position.y + 20);
    const movedBlock = await (await request.get(path)).json();
    expect(movedBlock.nodes).toEqual(beforeMove.nodes);
    expect(movedBlock.edges).toEqual(beforeMove.edges);
    expect(await value()).toBe(4);
    await card.getByRole("button", { name: "Unpack block", exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(5);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    expect((await (await request.get(path)).json()).presentation.blocks).toEqual([]);
    expect(await value()).toBe(4);
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
