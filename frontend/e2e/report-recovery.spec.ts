import { test, expect, request as createRequest } from "@playwright/test";
const api = process.env.NODEBI_E2E_API ?? "http://localhost:8010";

for (const mode of ["create", "edit", "alignment"] as const) {
  test(`${mode} wizard restores draft and a committed request after disconnect`, async ({ page, request }) => {
    test.setTimeout(120000);
    const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Wizard recovery acceptance" } })).json();
    page.on("dialog", dialog => dialog.accept());
    try {
      const root = `${api}/api/v1/projects/${project.id}`;
      const source = await (await request.post(`${root}/imports`, { multipart: { connector: "csv", file: { name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from("category,amount\nA,0.10\nA,0.20\nB,0.50\n") } } })).json();
      const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
      const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
      const seedResponse = await request.post(`${root}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Seed", dimensions: [profile.fields[0].field_id], measures: [{ name: "Revenue", operation: "sum", column_id: profile.fields[1].field_id }] } });
      expect(seedResponse.ok()).toBeTruthy(); const seed = await seedResponse.json();
      let rightPublication = "", value = "";
      if (mode === "alignment") {
        const graph = await (await request.get(`${api}/api/v1/workflows/${seed.workflow_id}`)).json();
        const group = graph.nodes.find((n: { type: string }) => n.type === "group_by");
        const visual = await (await request.get(`${api}/api/v1/visualizations/${seed.visualization_id}`)).json();
        value = visual.config.value_column_id; rightPublication = crypto.randomUUID();
        const filter = { id: crypto.randomUUID(), type: "filter", version: 1, position: { x: 500, y: 200 }, config: { conditions: [{ column_id: profile.fields[0].field_id, operator: "equals", value: "A" }] } };
        expect((await request.put(`${api}/api/v1/workflows/${seed.workflow_id}`, { data: { name: graph.name, format_version: 3, expected_revision: graph.revision, nodes: [...graph.nodes, filter], edges: [...graph.edges, { id: crypto.randomUUID(), source_node_id: group.id, source_port: "dataset", target_node_id: filter.id, target_port: "input" }], result_catalog: { ...graph.result_catalog, outputs: [...graph.result_catalog.outputs, { id: rightPublication, name: "Plan", node_id: filter.id, port: "dataset", kind: "dataset" }] } } })).ok()).toBeTruthy();
      }
      await page.goto(`/projects/${project.id}/build${mode === "edit" ? `?visualization=${seed.visualization_id}` : mode === "alignment" ? "?alignment=1" : ""}`);
      await page.getByLabel(mode === "edit" ? "Visualization name" : "Report name", { exact: true }).fill("Recovered wizard report");
      if (mode === "alignment") {
        await page.getByRole("combobox", { name: "Calculation graph", exact: true }).selectOption(seed.workflow_id);
        await page.getByRole("combobox", { name: "Left prepared result", exact: true }).selectOption(seed.publication_id);
        await page.getByRole("combobox", { name: "Right prepared result", exact: true }).selectOption(rightPublication);
        await page.getByRole("combobox", { name: "Left key", exact: true }).selectOption(profile.fields[0].field_id);
        await page.getByRole("combobox", { name: "Right key", exact: true }).selectOption(profile.fields[0].field_id);
        await page.getByRole("combobox", { name: "Left measure", exact: true }).selectOption(value);
        await page.getByRole("combobox", { name: "Right measure", exact: true }).selectOption(value);
        await page.getByRole("button", { name: "Check formula fields", exact: true }).click();
        await page.getByRole("button", { name: "Add aligned formula", exact: true }).click();
        const first = page.getByRole("region", { name: "Formula 1", exact: true });
        await first.getByLabel("Formula name", { exact: true }).fill("Achievement %");
        const options = first.getByRole("combobox", { name: "Insert formula field", exact: true });
        const leftValue = await options.getByRole("option", { name: "Left measure · decimal", exact: true }).getAttribute("value");
        const rightValue = await options.getByRole("option", { name: "Right measure · decimal", exact: true }).getAttribute("value");
        expect(leftValue).toBeTruthy(); expect(rightValue).toBeTruthy();
        await first.getByLabel("Expression", { exact: true }).fill(`[${leftValue}] / nullif([${rightValue}], 0) * 100`);
        await page.getByRole("button", { name: "Check formula fields", exact: true }).click();
        await page.getByRole("button", { name: "Add aligned formula", exact: true }).click();
        const second = page.getByRole("region", { name: "Formula 2", exact: true });
        await second.getByLabel("Formula name", { exact: true }).fill("Change %");
        const previous = await second.getByRole("combobox", { name: "Insert formula field", exact: true }).getByRole("option", { name: /^Achievement % ·/ }).getAttribute("value");
        expect(previous).toBeTruthy();
        await second.getByLabel("Expression", { exact: true }).fill(`[${previous}] - 100`);
        await page.setViewportSize({ width: 760, height: 900 });
        await page.screenshot({ path: test.info().outputPath("alignment-formulas.png"), fullPage: true });
      } else {
        if (mode === "create") await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption(snapshot.id);
        await page.getByRole("button", { name: "Next", exact: true }).click();
        if (mode === "create") await page.getByRole("button", { name: "Add measure", exact: true }).click();
        for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
      }
      await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
      await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeEnabled();
      if (mode === "create") {
        await page.getByRole("navigation", { name: "Project navigation", exact: true }).getByRole("link", { name: "Overview", exact: true }).click();
        await page.getByRole("button", { name: "Keep draft and continue", exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
        await page.goBack();
      } else await page.reload();
      await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
      if (mode === "alignment") {
        await expect(page.getByRole("region", { name: "Formula 1", exact: true }).getByLabel("Formula name", { exact: true })).toHaveValue("Achievement %");
        await expect(page.getByRole("region", { name: "Formula 2", exact: true }).getByLabel("Expression", { exact: true })).toHaveValue(/\] - 100$/);
      }
      await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeDisabled();
      await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
      await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeEnabled();
      const endpoint = `${root}/${mode === "alignment" ? "alignment-reports" : `report-builder${mode === "edit" ? `/${seed.visualization_id}` : ""}`}/apply`;
      const attempts: unknown[] = [];
      let committed: { workflow_id: string; visualization_id: string; dashboard_id?: string } | undefined;
      await page.route(endpoint, async route => {
        attempts.push(route.request().postDataJSON());
        if (attempts.length === 1) {
          const response = await route.fetch(); expect(response.ok()).toBeTruthy(); committed = await response.json();
          await route.abort("connectionreset");
        } else await route.continue();
      });
      await page.getByRole("button", { name: "Save report", exact: true }).click();
      await expect(page.getByRole("button", { name: "Retry report save", exact: true })).toBeEnabled();
      expect(committed?.visualization_id).toBeTruthy();
      const graphBeforeRetry = await (await request.get(`${api}/api/v1/workflows/${committed!.workflow_id}`)).json();
      // Recovery must not depend on current authoring metadata being available.
      await page.route(`${root}/report-builder/**`, async route => { if (route.request().method() === "GET") await route.abort("failed"); else await route.fallback(); });
      await page.reload();
      await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
      await expect(page.getByRole("button", { name: "Preview calculation", exact: true })).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "Pending report save", exact: true })).toBeFocused();
      if (mode === "create") await page.setViewportSize({ width: 760, height: 900 });
      await page.screenshot({ path: test.info().outputPath(`${mode}-pending-save.png`), fullPage: true });
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Retry report save", exact: true })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("heading", { name: "Report is ready", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Report is ready", exact: true })).toBeFocused();
      expect(attempts).toHaveLength(2); expect(attempts[0]).toEqual(attempts[1]);
      expect((await (await request.get(`${root}/visualizations`)).json()).items).toHaveLength(mode === "edit" ? 1 : 2);
      expect((await (await request.get(`${root}/dashboards`)).json()).items).toHaveLength(mode === "edit" ? 1 : 2);
      expect(await (await request.get(`${api}/api/v1/workflows/${committed!.workflow_id}`)).json()).toEqual(graphBeforeRetry);
      if (mode === "alignment") {
        expect(graphBeforeRetry.nodes.slice(-3).map((node: { type: string }) => node.type)).toEqual(["align_measures", "calculated_column", "calculated_column"]);
        const rendered = await request.post(`${api}/api/v1/visualizations/${committed!.visualization_id}/result`, { data: {} });
        expect(rendered.ok()).toBeTruthy();
        expect((await rendered.json()).rows.map((row: Record<string, unknown>) => Object.values(row))).toEqual([
          ["A", "0.30", "0.30", true, true, "100.00", "0.00"],
          ["B", "0.50", null, true, false, null, null],
        ]);
      }
      expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith("nodebi:report-draft:")))).toEqual([]);
    } finally {
      const cleanup = await createRequest.newContext();
      expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
      await cleanup.dispose();
    }
  });
}
