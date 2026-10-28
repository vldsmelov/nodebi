import { expect, request as createRequest, test } from "@playwright/test";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

for (const version of [1, 3]) test(`graph v${version}: find and pan distant nodes without saving selection or losing drafts`, async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Node finder acceptance" } })).json();
  try {
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Large canvas" } })).json();
    const nodes = [crypto.randomUUID(), crypto.randomUUID()].map((id, index) => ({ id, type: "calculated_column", version: 1, position: { x: index * 50000, y: index * 50000 }, config: { name: "Repeated name", expression: "1" }, ui: {} }));
    const saved = await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: { name: workflow.name, format_version: version, nodes, edges: [], parameters: [], expected_revision: workflow.revision } });
    expect(saved.ok(), await saved.text()).toBeTruthy(); const baseline = await saved.json();
    await page.goto(`/projects/${project.id}/workflow${version === 3 ? "?mode=fields" : ""}`);
    await page.getByLabel("Find workflow node", { exact: true }).fill("REPEATED NAME");
    await expect(page.getByLabel("Edit workflow node").locator("option")).toHaveCount(3);
    const labels = await page.getByLabel("Edit workflow node").locator("option").allTextContents();
    expect(new Set(labels).size).toBe(3);
    for (const node of nodes) expect(labels.join(" ")).not.toContain(node.id.slice(0, 6));
    await page.getByLabel("Find workflow node", { exact: true }).fill(nodes[1].id);
    await expect(page.getByLabel("Edit workflow node").locator(`option[value="${nodes[1].id}"]`)).toHaveText(labels[2]);
    await page.getByLabel("Find workflow node", { exact: true }).fill("REPEATED NAME");
    await page.getByLabel("Edit workflow node").selectOption(nodes[1].id);
    await expect(page.getByLabel("Output field name", { exact: true })).toHaveValue("Repeated name");
    await expect(page.locator(`.react-flow__node[data-id="${nodes[1].id}"]`)).toBeInViewport();
    expect((await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json()).revision).toBe(baseline.revision);
    const viewport = () => page.locator(".react-flow__viewport").evaluate(element => {
      const matrix = new DOMMatrix(getComputedStyle(element).transform);
      return { x: matrix.m41, y: matrix.m42, zoom: matrix.a };
    });
    const initialView = await viewport();
    await page.getByRole("button", { name: "View left", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(async () => (await viewport()).x).toBeCloseTo(initialView.x + 200, 2);
    await page.getByRole("button", { name: "View down", exact: true }).click();
    await expect.poll(async () => (await viewport()).y).toBeCloseTo(initialView.y - 200, 2);
    expect((await viewport()).zoom).toBe(initialView.zoom);
    await page.getByRole("button", { name: "View right", exact: true }).click();
    await page.getByRole("button", { name: "View up", exact: true }).click();
    await expect.poll(viewport).toEqual(initialView);
    expect(await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json()).toEqual(baseline);
    if (version === 3) await page.getByText("Advanced settings", { exact: true }).click();
    await page.getByLabel("Output field name", { exact: true }).fill("Changed through finder");
    await page.getByLabel("Find workflow node", { exact: true }).fill(nodes[0].id);
    await page.getByLabel("Edit workflow node").selectOption(nodes[0].id);
    await expect(page.locator(`.react-flow__node[data-id="${nodes[0].id}"]`)).toBeInViewport();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const changed = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    expect(changed.nodes.find((node: { id: string }) => node.id === nodes[1].id).config.name).toBe("Changed through finder");
    expect(changed.nodes.map((node: { position: object }) => node.position)).toEqual(nodes.map(node => node.position));
  } finally {
    const cleanup = await createRequest.newContext();
    try { expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
    finally { await cleanup.dispose(); }
  }
});
