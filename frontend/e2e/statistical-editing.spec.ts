import { test, expect, request as createRequest } from "@playwright/test";
const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const kind of ["histogram", "boxplot_stats", "heatmap_stats", "table_rollup", "pareto", "funnel_steps", "treemap_chart", "sunburst_chart"] as const) test(`edit ${kind} in the wizard preserves manual preparation, appearance and pending recovery`, async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  page.on("dialog", dialog => dialog.accept());
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: `Edit ${kind}` } })).json();
  const root = `${api}/api/v1/projects/${project.id}`;
  try {
    const hierarchy = kind === "treemap_chart" || kind === "sunburst_chart";
    const content = ["pareto", "funnel_steps"].includes(kind) || hierarchy ? "region,value,month,other\nA,100.00,1,90.00\nB,60.00,2,50.00\nC,20.00,3,10.00\n" : "region,value,month\nA,10.00,Jan\nA,20.00,Jan\nB,0.00,Feb\n";
    const source = await (await request.post(`${root}/imports`, { multipart: { connector: "csv", file: { name: "Sales.csv", mimeType: "text/csv", buffer: Buffer.from(content) } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const [region, value, month, other] = profile.fields.map((f: { field_id: string }) => f.field_id);
    const analysis = hierarchy ? { type: kind, dimensions: [region, month], measures: [{ output_id: crypto.randomUUID(), name: "Revenue", operation: "sum", column_id: value }] } : kind === "pareto" ? { type: kind, category_column_id: region, value_column_id: value } : kind === "funnel_steps" ? { type: kind, stage_column_id: region, order_column_id: month, value_column_id: value } : kind === "table_rollup" ? { type: kind, dimensions: [region], measures: [{ output_id: crypto.randomUUID(), name: "Revenue", operation: "sum", column_id: value }] } : kind === "heatmap_stats" ? { type: kind, x_column_id: region, y_column_id: month, value_column_id: value, aggregation: "sum" } : { type: kind, value_column_id: value };
    const created = await request.post(`${root}/statistical-reports/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Saved analysis", analysis } });
    expect(created.ok()).toBeTruthy(); const ids = await created.json();
    const graphUrl = `${api}/api/v1/workflows/${ids.workflow_id}`, visualUrl = `${api}/api/v1/visualizations/${ids.visualization_id}`;
    const graph = await (await request.get(graphUrl)).json();
    const manual = { id: crypto.randomUUID(), type: "sort", version: 1, position: { x: 250, y: 240 }, ui: { label: "Manual sort" }, config: { keys: [{ column_id: region, direction: "ascending" }] } };
    const sourceNode = graph.nodes.find((n: { type: string }) => n.type === "dataset_source");
    graph.nodes.push(manual); graph.edges[0].source_node_id = manual.id;
    graph.edges.push({ id: crypto.randomUUID(), source_node_id: sourceNode.id, source_port: "dataset", target_node_id: manual.id, target_port: "input" });
    const saveGraph = (g: typeof graph) => request.put(graphUrl, { data: { name: g.name, nodes: g.nodes, edges: g.edges, result_catalog: g.result_catalog, presentation: g.presentation, parameters: g.parameters, expected_revision: g.revision, format_version: 3 } });
    expect((await saveGraph(graph)).ok()).toBeTruthy();
    let before = await (await request.get(graphUrl)).json();
    const visualBefore = await (await request.get(visualUrl)).json();
    const dashboardBefore = await (await request.get(`${api}/api/v1/dashboards/${ids.dashboard_id}`)).json();
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${ids.dashboard_id}`);
    await page.getByLabel("Widget actions", { exact: true }).click();
    await page.getByRole("link", { name: "Edit in report wizard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Edit analytical calculation", exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Analysis type", exact: true })).toBeDisabled();
    await page.getByText("Calculation steps", { exact: true }).click();
    await expect(page.getByText("Sort · Preserved step", { exact: true })).toBeVisible();
    const modify = async () => {
      if (kind === "histogram") await page.getByLabel("Interval count", { exact: true }).fill("2");
      else if (kind === "boxplot_stats") await page.getByLabel("Distribution grouping", { exact: true }).selectOption(region);
      else if (kind === "heatmap_stats") await page.getByRole("combobox", { name: "Cell aggregation", exact: true }).selectOption("average");
      else if (kind === "pareto") await page.getByLabel("Pareto contribution", { exact: true }).selectOption(other);
      else if (kind === "funnel_steps") await page.getByLabel("Stage value", { exact: true }).selectOption(other);
      else if (hierarchy) {
        await page.getByRole("button", { name: "Move rollup dimension 2 up", exact: true }).click();
        await page.getByLabel("Update hierarchy fields after changing grouping or measures", { exact: true }).check();
      }
      else await page.getByLabel("Rollup operation 1", { exact: true }).selectOption("average");
    };
    await modify();
    await page.reload();
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeEnabled();
    expect(await (await request.get(graphUrl)).json()).toEqual(before);
    if (kind === "table_rollup") {
      await page.screenshot({ path: testInfo.outputPath("analytical-edit.png"), fullPage: true });
      await page.setViewportSize({ width: 760, height: 1000 });
      await page.screenshot({ path: testInfo.outputPath("analytical-edit-narrow.png"), fullPage: true });
      await page.setViewportSize({ width: 1600, height: 1000 });
    }
    if (kind === "histogram") {
      const changed = { ...before, name: "Other tab" };
      expect((await saveGraph(changed)).ok()).toBeTruthy();
      before = await (await request.get(graphUrl)).json();
      await page.getByRole("button", { name: "Save report", exact: true }).click();
      await expect(page.getByText("The project changed. Reload the report before saving your changes.", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Reload saved report", exact: true }).click();
      await expect(page.getByLabel("Interval count", { exact: true })).toHaveValue("20");
      await modify();
      await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
      await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeEnabled();
    }
    const bodies: string[] = [];
    await page.route(`**/statistical-reports/${ids.visualization_id}/apply`, async route => {
      bodies.push(route.request().postData()!);
      if (bodies.length === 1) { expect((await route.fetch()).ok()).toBeTruthy(); await route.abort("connectionreset"); }
      else await route.continue();
    });
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await expect(page.getByRole("button", { name: "Retry report save", exact: true })).toBeEnabled();
    await page.route(`**/statistical-reports/${ids.visualization_id}`, route => route.abort("connectionreset"));
    await page.reload();
    await page.getByRole("button", { name: "Restore local draft", exact: true }).click();
    await page.getByRole("button", { name: "Retry report save", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Report is ready", exact: true })).toBeVisible();
    expect(bodies).toHaveLength(2); expect(bodies[1]).toBe(bodies[0]);
    const after = await (await request.get(graphUrl)).json();
    expect(after.nodes.find((n: { id: string }) => n.id === manual.id)).toEqual(before.nodes.find((n: { id: string }) => n.id === manual.id));
    expect(after.nodes.map((n: { id: string }) => n.id)).toEqual(before.nodes.map((n: { id: string }) => n.id));
    expect(after.edges).toEqual(before.edges);
    expect(after.result_catalog).toEqual(before.result_catalog);
    expect(after.revision).toBe(before.revision + 1);
    const expectedConfig = structuredClone(visualBefore.config);
    if (hierarchy) expectedConfig.spec.dimensions.reverse();
    expect((await (await request.get(visualUrl)).json()).config).toEqual(expectedConfig);
    expect(await (await request.get(`${api}/api/v1/dashboards/${ids.dashboard_id}`)).json()).toEqual(dashboardBefore);
    await page.unroute(`**/statistical-reports/${ids.visualization_id}`);
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\?/);
    if (kind === "table_rollup") await expect(page.getByTestId("analytical-table")).toBeVisible();
    else await expect(page.getByRole("img", { name: "Saved analysis", exact: true }).locator("canvas").first()).toBeVisible();
    await page.reload();
    const result = await request.post(`${visualUrl}/result`, { data: {} });
    expect(result.ok()).toBeTruthy();
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${root}?confirm=true`)).ok()).toBeTruthy(); await cleanup.dispose();
  }
});
