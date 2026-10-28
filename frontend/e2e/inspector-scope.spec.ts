import { expect, test, request as createRequest } from "@playwright/test";
import { activateByKeyboard, chooseByKeyboard, typeByKeyboard } from "./keyboard-navigation";

const api = process.env.NODEBI_E2E_API ?? "http://localhost:8020";
for (const format of [1, 3]) for (const version of [1, 2]) {
  test(`condition scratch does not cross nodes in graph v${format}, formula v${version}`, async ({ page, request }) => {
    const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Inspector scope" } })).json();
    try {
      const graph = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Two calculations" } })).json();
      const nodes = ["First", "Second"].map((name, index) => ({
        id: crypto.randomUUID(), type: "calculated_column", version,
        position: { x: index * 350, y: 0 }, ui: { label: name },
        config: { name, expression: String(index + 1), ...(version === 2 ? { precision: 38, scale: 2 } : {}) },
      }));
      const url = `${api}/api/v1/workflows/${graph.id}`;
      expect((await request.put(url, { data: { name: graph.name, expected_revision: graph.revision, format_version: format, nodes, edges: [] } })).ok()).toBeTruthy();
      await page.goto(`/projects/${project.id}/workflow?workflow=${graph.id}`);
      const choose = page.getByLabel("Edit workflow node", { exact: true });
      const openCondition = async () => {
        if (format === 3 && version === 1) {
          const advanced = page.getByText("Advanced settings", { exact: true });
          if (!await advanced.evaluate(element => element.parentElement?.hasAttribute("open"))) await activateByKeyboard(page, advanced);
        }
        const condition = page.getByText("Build a condition", { exact: true });
        if (!await condition.evaluate(element => element.parentElement?.hasAttribute("open"))) await activateByKeyboard(page, condition);
      };
      await chooseByKeyboard(page, choose, { value: nodes[0].id });
      await openCondition();
      await typeByKeyboard(page, page.getByLabel("When true", { exact: true }), "123");
      await chooseByKeyboard(page, choose, { value: nodes[1].id });
      await openCondition();
      await expect(page.getByLabel("When true", { exact: true })).toHaveValue("");
      await expect(page.getByLabel("Expression", { exact: true })).toHaveValue("2");
      await expect(page.getByRole("button", { name: "Use condition", exact: true })).toBeDisabled();
      await typeByKeyboard(page, page.getByLabel("Expression", { exact: true }), "3");
      await expect.poll(async () => (await (await request.get(url)).json()).nodes.find((node: { id: string }) => node.id === nodes[1].id).config.expression).toBe("3");
      await chooseByKeyboard(page, choose, { value: nodes[0].id });
      await openCondition();
      await expect(page.getByLabel("When true", { exact: true })).toHaveValue("123");
      await expect(page.getByLabel("Expression", { exact: true })).toHaveValue("1");
      await page.reload();
      await chooseByKeyboard(page, choose, { value: nodes[0].id });
      await openCondition();
      await expect(page.getByLabel("When true", { exact: true })).toHaveValue("123");
      await activateByKeyboard(page, page.getByRole("button", { name: "Discard condition draft", exact: true }));
      await expect(page.getByLabel("When true", { exact: true })).toHaveValue("");
      const final = await (await request.get(url)).json();
      expect(final.nodes.find((node: { id: string }) => node.id === nodes[0].id).config.expression).toBe("1");
    } finally {
      const cleanup = await createRequest.newContext();
      try { expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy(); }
      finally { await cleanup.dispose(); }
    }
  });
}
