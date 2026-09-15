import { expect, test } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
const workbookPath = process.env.NODEBI_REFERENCE_WORKBOOK;
const expectedPath = process.env.NODEBI_REFERENCE_EXPECTED;
test.use({ actionTimeout: 20000 });

// Financial mappings below are only UI authoring instructions for a sample project.
// Every transformation is saved as a normal editable node; all API access is read-only.
test("author and verify the reference overview entirely through the constructor", async ({ page, request }) => {
  test.skip(!workbookPath || !expectedPath, "Opt-in private workbook/reference parity scenario");
  test.setTimeout(600000);
  await page.setViewportSize({ width: 1600, height: 2200 });
  const expected = JSON.parse(readFileSync(resolve(expectedPath!), "utf8"));
  let projectId = "", workflowId = "", completed = false;
  const widgets: { id: string; title: string }[] = [];
  const hex = (id: string) => id.replaceAll("-", "");
  const field = (id: string) => `calc_${hex(id)}`;
  const agg = (id: string, index: number) => `agg_${hex(id)}_${index}`;
  const saved = () => expect(page.getByText("Saved", { exact: true })).toBeVisible();
  async function add(kind: string, upstream: string | null, configure: () => Promise<void>) {
    const count = await page.locator(".react-flow__node").count();
    await page.getByTitle(`Add ${kind}`, { exact: true }).click();
    await expect(page.locator(".react-flow__node")).toHaveCount(count + 1);
    const id = await page.locator(".react-flow__node").last().getAttribute("data-id");
    expect(id).toBeTruthy();
    if (upstream) await page.getByLabel("Input input", { exact: true }).selectOption(`${upstream}:dataset`);
    await configure();
    await saved();
    return id!;
  }
  async function calc(upstream: string, name: string, expression: string) {
    return add("Calculated Column", upstream, async () => {
      await page.getByLabel("Output field name", { exact: true }).fill(name);
      await page.getByLabel("Expression", { exact: true }).fill(expression);
    });
  }
  async function group(upstream: string, dimensions: string[], aggregations: [string | null, string, string][]) {
    return add("Group By", upstream, async () => {
      for (const name of dimensions) await page.getByRole("checkbox", { name, exact: true }).check();
      for (const [index, [column, operation, name]] of aggregations.entries()) {
        await page.getByRole("button", { name: "Add aggregation", exact: true }).click();
        if (column) await page.getByLabel(`Aggregate field ${index + 1}`, { exact: true }).selectOption(column);
        await page.getByLabel(`Aggregation ${index + 1}`, { exact: true }).selectOption(operation);
        await page.getByLabel(`Aggregate name ${index + 1}`, { exact: true }).fill(name);
      }
    });
  }
  async function chart(kind: string, upstream: string, title: string, value: string, category?: string, percent = false, decimals = 2) {
    const id = await add(kind, upstream, async () => {
      await page.getByLabel("Chart title", { exact: true }).fill(title);
      if (category) await page.getByLabel("Chart category", { exact: true }).selectOption(category);
      await page.getByLabel("Chart value", { exact: true }).selectOption(value);
      await page.getByLabel("Decimal places", { exact: true }).fill(String(decimals));
      if (percent) await page.getByLabel("Number format", { exact: true }).selectOption("percent");
    });
    widgets.push({ id, title });
    return id;
  }
  async function table(upstream: string, title: string, names: string[]) {
    const id = await add("Table", upstream, async () => {
      await page.getByLabel("Chart title", { exact: true }).fill(title);
      const labels = page.locator("aside").last().locator("label").filter({ has: page.locator('input[type="checkbox"]') });
      for (const label of await labels.all()) {
        if (!names.includes((await label.innerText()).trim())) await label.locator("input").uncheck();
      }
      for (const name of names) await page.getByRole("checkbox", { name, exact: true }).check();
    });
    widgets.push({ id, title });
    return id;
  }
  async function sort(upstream: string, columns: [string, string][]) {
    return add("Sort", upstream, async () => {
      for (const [index, [column, direction]] of columns.entries()) {
        await page.getByRole("button", { name: "Add sort field", exact: true }).click();
        await page.getByLabel(`Sort field ${index + 1}`, { exact: true }).selectOption(column);
        await page.getByLabel(`Sort direction ${index + 1}`, { exact: true }).selectOption(direction);
      }
    });
  }
  async function result(id: string) {
    const response = await request.get(`${api}/api/v1/visualizations/${id}/result`);
    expect(response.ok(), await response.text()).toBeTruthy();
    return response.json();
  }
  try {
    await page.goto("/projects");
    await page.getByLabel("Project name", { exact: true }).fill("Калькуляция затрат — конструктор");
    const created = page.waitForResponse(response => response.url().endsWith("/api/v1/projects") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Create project", exact: true }).click();
    projectId = (await (await created).json()).id;
    await page.goto(`/projects/${projectId}/data`);
    await page.locator('input[type="file"]').setInputFiles(resolve(workbookPath!));
    await expect(page.getByLabel("Worksheet")).toBeVisible();
    await page.goto(`/projects/${projectId}/workflow`);
    const workflowCreated = page.waitForResponse(response => response.url().endsWith("/workflows") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Create workflow", exact: true }).click();
    workflowId = (await (await workflowCreated).json()).id;
    let base = await add("Excel Source", null, async () => {
      await page.getByLabel("Worksheet", { exact: true }).selectOption("Калькуляция");
      await page.getByLabel("First header row").fill("3");
      await page.getByLabel("Header row count").fill("2");
      await page.getByLabel("Include source row number").check();
    });
    base = await add("Convert Types", base, async () => {
      await page.getByRole("button", { name: "Add conversion" }).click();
      await page.getByLabel("Conversion field").selectOption("col_1");
      await page.getByLabel("Invalid values").selectOption("null");
    });
    const service = await calc(base, "Услуга", 'nullif(trim(coalesce([col_3], "")), "")');
    const serviceLower = await calc(service, "Название для отбора", `lower([${field(service)}])`);
    const category = await calc(serviceLower, "Класс", 'coalesce(nullif(trim([col_2]), ""), "Без класса")');
    base = await add("Filter", category, async () => {
      for (const [index, [column, operator, value]] of [
        ["col_1", "is_not_null", null], [field(service), "is_not_null", null], [field(serviceLower), "not_equals", "обоснование"],
      ].entries()) {
        await page.getByRole("button", { name: "Add condition", exact: true }).click();
        await page.getByLabel(`Filter column ${index + 1}`, { exact: true }).selectOption(column!);
        await page.getByLabel(`Filter operator ${index + 1}`, { exact: true }).selectOption(operator!);
        if (value) await page.getByLabel(`Filter value ${index + 1}`, { exact: true }).fill(value);
      }
    });
    base = await add("Convert Types", base, async () => {
      for (const [index, column] of ["col_5", "col_17", "col_23", "col_24", "col_25"].entries()) {
        await page.getByRole("button", { name: "Add conversion" }).click();
        await page.getByLabel("Conversion field", { exact: true }).nth(index).selectOption(column);
      }
    });
    const direct = await calc(base, "Прямые расходы", "coalesce([col_5], 0)");
    const ineff = await calc(direct, "Неэффективность", "coalesce([col_23], 0) + coalesce([col_24], 0) + coalesce([col_25], 0)");
    const indirect = await calc(ineff, "Косвенные расходы", `coalesce([col_17], 0) - [${field(ineff)}]`);
    base = await calc(indirect, "Итого", `[${field(direct)}] + coalesce([col_17], 0)`);
    const totals = await group(base, [], [
      [field(category), "distinct_count", "Всего классов"], [null, "count", "Всего услуг"],
      [field(direct), "sum", "Прямые"], [field(indirect), "sum", "Косвенные"],
      [field(ineff), "sum", "Неэффективность"], [field(base), "sum", "Общая сумма"],
    ]);
    const totalsWithShare = await calc(totals, "Доля неэффективности", `safe_divide([${agg(totals, 4)}], [${agg(totals, 5)}], 0)`);
    const classCount = await chart("KPI", totals, "Всего классов", agg(totals, 0), undefined, false, 0);
    const serviceCount = await chart("KPI", totals, "Всего услуг", agg(totals, 1), undefined, false, 0);
    const grandTotal = await chart("KPI", totals, "Общая сумма", agg(totals, 5));
    const ineffTotal = await chart("KPI", totals, "Неэффективность", agg(totals, 4));
    const ineffShare = await chart("KPI", totalsWithShare, "Доля неэффективности", field(totalsWithShare), undefined, true);
    const structure = await add("Unpivot", totals, async () => {
      const fields = page.getByRole("group", { name: "Fields to turn into rows", exact: true });
      for (const name of ["Прямые", "Косвенные", "Неэффективность"]) await fields.getByLabel(name, { exact: true }).check();
    });
    const costPie = await chart("Donut Chart", structure, "Структура затрат", `unpivot_${hex(structure)}_value`, `unpivot_${hex(structure)}_field_name`);
    const classes = await group(base, ["Класс"], [[null, "count", "Услуг"], [field(base), "sum", "Итого класса"]]);
    const classWindow = await add("Window", classes, async () => {
      await page.getByLabel("Output field name", { exact: true }).fill("Общий итог классов");
      await page.getByLabel("Value field", { exact: true }).selectOption(agg(classes, 1));
    });
    const classShares = await calc(classWindow, "Доля", `safe_divide([${agg(classes, 1)}], [window_${hex(classWindow)}], 0)`);
    const orderedClasses = await sort(classShares, [[agg(classes, 1), "descending"]]);
    const classTable = await table(orderedClasses, "Детализация по классам", ["Класс", "Услуг", "Итого класса", "Доля"]);
    await page.getByLabel("Format for Услуг", { exact: true }).selectOption("number");
    await page.getByLabel("Decimals for Услуг", { exact: true }).fill("0");
    await page.getByLabel("Format for Доля", { exact: true }).selectOption("percent");
    await saved();
    const classPie = await chart("Donut Chart", orderedClasses, "Распределение по классам", agg(classes, 1), field(category));
    const orderedServices = await sort(base, [[field(base), "descending"], ["col_39", "ascending"]]);
    const top = await add("Limit", orderedServices, async () => { await page.getByLabel("Maximum rows", { exact: true }).fill("40"); });
    const serviceTable = await table(top, "Топ услуг (до 40)", ["Класс", "Услуга", "Итого"]);
    const scalar = async (id: string) => { const data = await result(id); return data.rows[0][data.value_field]; };
    expect(await scalar(classCount)).toBe(expected.overview.totals.total_classes);
    expect(await scalar(serviceCount)).toBe(expected.overview.totals.total_services);
    expect(await scalar(grandTotal)).toBeCloseTo(expected.overview.totals.grand_total, 5);
    expect(await scalar(ineffTotal)).toBeCloseTo(expected.overview.totals.inefficiency_total, 5);
    expect(await scalar(ineffShare)).toBeCloseTo(expected.overview.totals.inefficiency_share_of_total / 100, 12);
    const costResult = await result(costPie);
    costResult.rows.forEach((row: Record<string, number>, index: number) => expect(row[costResult.value_field]).toBeCloseTo(expected.overview.charts.cost_structure_values[index], 5));
    const classResult = await result(classTable);
    expect(classResult.rows).toHaveLength(expected.navigation.class_rows.length);
    classResult.rows.forEach((row: Record<string, unknown>, index: number) => {
      const original = expected.navigation.class_rows[index];
      expect(row["Класс"]).toBe(original.name);
      expect(row["Услуг"]).toBe(original.services_count);
      expect(row["Итого класса"]).toBeCloseTo(original.totals.total, 5);
      expect(row["Доля"]).toBeCloseTo(original.share / 100, 12);
    });
    const classChart = await result(classPie);
    classChart.rows.forEach((row: Record<string, unknown>, index: number) => {
      expect(row[classChart.category_field]).toBe(expected.navigation.class_rows[index].name);
      expect(row[classChart.value_field]).toBeCloseTo(expected.navigation.class_rows[index].totals.total, 5);
    });
    const services = await result(serviceTable);
    expect(services.rows).toHaveLength(Math.min(40, expected.navigation.services.length));
    services.rows.forEach((row: Record<string, unknown>, index: number) => {
      expect(row["Услуга"]).toBe(expected.navigation.services[index].service_name);
      expect(row["Класс"]).toBe(expected.navigation.services[index].class_name);
      expect(row["Итого"]).toBeCloseTo(expected.navigation.services[index].total_cost, 5);
    });
    await page.goto(`/projects/${projectId}/dashboard`);
    await page.getByRole("button", { name: "Create dashboard", exact: true }).click();
    await page.getByLabel("Dashboard name", { exact: true }).fill("Общая сводка затрат");
    const orderedWidgets = [...widgets.slice(0, 6), widgets[7], widgets[6], widgets[8]];
    const layouts = [
      [0, 0, 2, 5], [2, 0, 2, 5], [4, 0, 3, 5], [7, 0, 3, 5], [10, 0, 2, 5],
      [0, 5, 6, 10], [6, 5, 6, 10], [0, 15, 6, 12], [6, 15, 6, 12],
    ];
    for (const [index, widget] of orderedWidgets.entries()) {
      await page.getByLabel("Add visualization", { exact: true }).selectOption(widget.id);
      await page.getByRole("button", { name: "Add widget", exact: true }).click();
      const tile = page.locator("[data-widget-id]").last();
      await tile.evaluate(element => element.scrollIntoView({ block: "center" }));
      const grid = await page.locator(".react-grid-layout").boundingBox();
      const bounds = await tile.boundingBox();
      const resize = await tile.locator(".react-resizable-handle").boundingBox();
      if (!grid || !bounds || !resize) throw new Error("Widget layout controls unavailable");
      const [x, y, width, height] = layouts[index];
      const step = (grid.width - 12) / 12;
      await page.mouse.move(resize.x + 5, resize.y + 5);
      await page.mouse.down();
      await page.mouse.move(resize.x + 5 + width * step - 12 - bounds.width, resize.y + 5 + height * 42 - 12 - bounds.height, { steps: 8 });
      await page.mouse.up();
      await expect.poll(async () => Math.round((await tile.boundingBox())!.height)).toBe(height * 42 - 12);
      const gridTop = await page.locator(".react-grid-layout").evaluate(element => element.getBoundingClientRect().top + window.scrollY);
      await page.evaluate(top => window.scrollTo(0, Math.max(0, top - 90)), gridTop + 12 + y * 42);
      const handle = await tile.locator(".widget-handle").boundingBox();
      const current = await tile.boundingBox();
      const updatedGrid = await page.locator(".react-grid-layout").boundingBox();
      if (!handle || !current || !updatedGrid) throw new Error("Widget drag handle unavailable");
      await page.mouse.move(handle.x + 20, handle.y + 10);
      await page.mouse.down();
      await page.mouse.move(handle.x + 20 + updatedGrid.x + 12 + x * step - current.x, handle.y + 10 + updatedGrid.y + 12 + y * 42 - current.y, { steps: 8 });
      await page.mouse.up();
    }
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click();
    await saved();
    await page.reload();
    await expect(page.locator("[data-widget-id]")).toHaveCount(widgets.length);
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    const dashboards = await (await request.get(`${api}/api/v1/projects/${projectId}/dashboards`)).json();
    for (const [index, widget] of orderedWidgets.entries()) {
      const stored = dashboards.items[0].widgets.find((item: { visualization_id: string }) => item.visualization_id === widget.id);
      const [x, y, width, height] = layouts[index];
      expect(stored).toMatchObject({ x, y, width, height });
    }
    if (process.env.NODEBI_REFERENCE_KEEP === "1") writeFileSync(resolve("../.backups/reference-overview-project.json"), JSON.stringify({ projectId, workflowId, graph, dashboards, widgets }, null, 2));
    completed = true;
    console.log(`Reference overview: ${graph.nodes.length} editable nodes, ${widgets.length} widgets, numeric parity passed. Project ${projectId}`);
  } finally {
    if (projectId && !(completed && process.env.NODEBI_REFERENCE_KEEP === "1")) {
      await request.delete(`${api}/api/v1/projects/${projectId}?confirm=true`);
    }
  }
});
