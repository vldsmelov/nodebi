import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const kind of ["arithmetic", "formula", "parameter"]) test(`exact field ${kind} settings and scalar KPI survive edit and reload`, async ({ page, request }) => {
  const formula = kind !== "arithmetic", parameter = kind === "parameter";
  const definition = { name: "adjustment", logical_type: "decimal", precision: 38, scale: 8, default: "0.00000001" };
  test.setTimeout(120000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Exact field scalar acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "money.csv", mimeType: "text/csv", buffer: Buffer.from("amount\n0.10\n0.20\n0.50\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    expect((await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).ok()).toBeTruthy();
    const flow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Exact field calculations" } })).json();
    const input = crypto.randomUUID(), constant = crypto.randomUUID(), calc = crypto.randomUUID(), total = crypto.randomUUID(), publication = crypto.randomUUID();
    const nodes = [
      { id: input, type: "dataset_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, resource_id: "table" } },
      { id: constant, type: parameter ? "scalar_parameter" : "scalar_constant", version: parameter ? 1 : 2, position: { x: 350, y: 0 }, config: parameter ? { name: "adjustment" } : { value: "0.00000001", scale: 8 } },
      { id: calc, type: formula ? "field_formula" : "field_arithmetic", version: 2, position: { x: 700, y: 0 }, config: formula ? { expression: "a + b", scale: 8 } : { operation: "add", scale: 8 } },
      { id: total, type: "field_sum", version: 2, position: { x: 1050, y: 0 }, config: {} },
    ];
    const edges = [[input, calc, "a", "dataset", profile.fields[0].field_id], [constant, calc, "b", "value", null], [input, total, "table", "dataset", null], [calc, total, "value", "value", null]].map(([start, end, port, output, column]) => ({ id: crypto.randomUUID(), source_node_id: start, target_node_id: end, target_port: port, source_port: output, source_column_id: column }));
    const url = `${api}/api/v1/workflows/${flow.id}`;
    const saved = await request.put(url, { data: { name: flow.name, expected_revision: 1, format_version: 3, nodes, edges, parameters: parameter ? [definition] : [], result_catalog: { outputs: [{ id: publication, name: "Exact total", node_id: total, port: "value", kind: "scalar" }] } } });
    expect(saved.ok(), await saved.text()).toBeTruthy();
    const visualResponse = await request.post(`${api}/api/v1/projects/${project.id}/visualizations`, { data: { workflow_id: flow.id, publication_id: publication, expected_workflow_revision: 2, name: "Exact KPI", type: "kpi", config: { spec: { type: "kpi" }, decimals: 8 } } });
    expect(visualResponse.ok(), await visualResponse.text()).toBeTruthy();
    const visual = await visualResponse.json();
    const board = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Exact report" } })).json();
    expect((await request.put(`${api}/api/v1/dashboards/${board.id}`, { data: { name: board.name, expected_revision: board.revision, configuration: parameter ? { parameters: [{ ...definition, name: "chosen" }], bindings: [{ workflow_id: flow.id, workflow_parameter: "adjustment", dashboard_parameter: "chosen" }] } : {}, widgets: [{ id: crypto.randomUUID(), visualization_id: visual.id, x: 0, y: 0, width: 6, height: 8 }] } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/workflow?workflow=${flow.id}&node=${constant}`);
    if (parameter) {
      await page.getByText("Workflow parameters", { exact: true }).click();
      await expect(page.getByLabel("Parameter type 1")).toHaveValue("decimal");
      await page.getByLabel("Parameter default 1").fill("0.00000002");
      await expect.poll(async () => (await (await request.get(url)).json()).parameters[0].default).toBe("0.00000002");
      await page.reload();
      await page.getByText("Workflow parameters", { exact: true }).click();
      await expect(page.getByLabel("Parameter default 1")).toHaveValue("0.00000002");
      await page.screenshot({ path: test.info().outputPath("decimal-parameter-settings.png"), fullPage: true });
    } else {
    await expect(page.getByLabel("Exact decimal value", { exact: true })).toHaveValue("0.00000001");
    await page.getByLabel("Exact decimal value", { exact: true }).fill("0.00000002");
    await expect.poll(async () => (await (await request.get(url)).json()).nodes.find((n: { id: string }) => n.id === constant).config.value).toBe("0.00000002");
    await page.reload();
    await expect(page.getByLabel("Exact decimal value", { exact: true })).toHaveValue("0.00000002");
    }
    await page.goto(`/projects/${project.id}/workflow?workflow=${flow.id}&node=${calc}`);
    await expect(page.getByRole("spinbutton", { name: "Decimal scale", exact: true })).toHaveValue("8");
    await expect(page.getByText(formula ? /One half-even rounding/ : /Half-even rounding at each arithmetic node/)).toBeVisible();
    if (formula) {
      await page.getByLabel("Expression", { exact: true }).fill("a / 3 * 3 + b");
      await expect.poll(async () => (await (await request.get(url)).json()).nodes.find((n: { id: string }) => n.id === calc).config.expression).toBe("a / 3 * 3 + b");
      await page.reload();
      await expect(page.getByLabel("Expression", { exact: true })).toHaveValue("a / 3 * 3 + b");
      await expect(page.getByRole("spinbutton", { name: "Decimal scale", exact: true })).toHaveValue("8");
    }
    await page.screenshot({ path: test.info().outputPath("exact-field-settings.png"), fullPage: true });
    await page.getByText("All operations", { exact: true }).click();
    await expect(page.getByTitle("Add Exact Sum field · v2", { exact: true })).toBeVisible();
    await expect(page.getByTitle("Add Sum field · v1", { exact: true })).toBeVisible();
    await expect(page.getByTitle("Add Exact Field expression · v2", { exact: true })).toBeVisible();
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${board.id}`);
    if (parameter) {
      await expect(page.getByTestId("kpi-value")).toHaveText("0.80000003");
      await page.getByLabel("Dashboard selection chosen").fill("0.00000002");
      await page.getByRole("button", { name: "Apply selections", exact: true }).click();
    }
    await expect(page.getByTestId("kpi-value")).toHaveText("0.80000006");
    await page.reload();
    await expect(page.getByTestId("kpi-value")).toHaveText("0.80000006");
    await page.screenshot({ path: test.info().outputPath("exact-scalar-kpi.png"), fullPage: true });
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
