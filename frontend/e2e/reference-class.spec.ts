import { expect, test } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConstructorAuthor, calculated as field, aggregate as agg, hex } from "./constructor-author";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
const artifactPath = process.env.NODEBI_REFERENCE_PROJECT;
const expectedPath = process.env.NODEBI_REFERENCE_EXPECTED;
const output = resolve("../.backups/reference-class-project.json");

// Opt-in authoring of the existing reference project. All writes use visible editor controls.
// A failed run retains its own IDs in a private progress artifact; never resets user data.
test("author the reference Class screen and verify every class slice", async ({ page, request }) => {
  test.skip(!artifactPath || !expectedPath, "Opt-in private reference project extension");
  test.setTimeout(600000);
  expect(existsSync(output), "Review retained progress before authoring another Class screen").toBe(false);
  const original = JSON.parse(readFileSync(resolve(artifactPath!), "utf8"));
  const expected = JSON.parse(readFileSync(resolve(expectedPath!), "utf8"));
  const { projectId, workflowId } = original;
  const initial = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
  const named = (name: string): string => {
    const matches = initial.nodes.filter((node: { config: { name?: string } }) => node.config.name === name);
    expect(matches).toHaveLength(1); return matches[0].id;
  };
  const base = named("Итого"), category = field(named("Класс")), service = field(named("Услуга"));
  const direct = field(named("Прямые расходы")), indirect = field(named("Косвенные расходы")), ineff = field(named("Неэффективность"));
  const overviewId = original.dashboards.items[0].id;
  const author = new ConstructorAuthor(page);
  const widgets: { id: string; title: string }[] = [];
  let dashboardId = "", completed = false;
  const addChart = async (kind: string, upstream: string, title: string, value: string, category?: string, format = "number", decimals = 2) => {
    const id = await author.chart(kind, upstream, title, value, category, format, decimals);
    widgets.push({ id, title }); return id;
  };
  try {
    await page.setViewportSize({ width: 1600, height: 2200 });
    await page.goto(`/projects/${projectId}/workflow`);
    await expect(page.locator(".react-flow__node")).toHaveCount(initial.nodes.length);
    await page.getByText("Workflow parameters", { exact: true }).click();
    expect(initial.parameters).toHaveLength(0);
    for (const [index, [name, type]] of [["class_name", "string"], ["service_id", "integer"], ["cost_type", "string"]].entries()) {
      await page.getByRole("button", { name: "Add parameter", exact: true }).click();
      await page.getByLabel(`Parameter name ${index + 1}`, { exact: true }).fill(name);
      await page.getByLabel(`Parameter type ${index + 1}`, { exact: true }).selectOption(type);
    }
    await author.saved();
    await page.getByText("Workflow parameters", { exact: true }).click();
    const classes = await author.group(base, ["Класс"], [
      [null, "count", "Услуг класса"], [direct, "sum", "Прямые"], [indirect, "sum", "Косвенные"],
      [ineff, "sum", "Неэффективность класса"], [field(base), "sum", "Сумма класса"],
    ]);
    const global = await author.window(classes, "Общий итог для доли класса", agg(classes, 4));
    const share = await author.calc(global, "Доля класса", `safe_divide([${agg(classes, 4)}], [window_${hex(global)}], 0)`);
    const selected = await author.filter(share, category, "class_name");
    const className = await addChart("KPI", selected, "Выбранный класс", category);
    const count = await addChart("KPI", selected, "Услуг в классе", agg(classes, 0), undefined, "number", 0);
    const total = await addChart("KPI", selected, "Итого класс", agg(classes, 4));
    const directKpi = await addChart("KPI", selected, "Прямые расходы класса", agg(classes, 1));
    const indirectKpi = await addChart("KPI", selected, "Косвенные расходы класса", agg(classes, 2));
    const shareKpi = await addChart("KPI", selected, "Доля от общей суммы", field(share), undefined, "percent");
    const structure = await author.add("Unpivot", selected, async () => {
      const fields = page.getByRole("group", { name: "Fields to turn into rows", exact: true });
      for (const name of ["Прямые", "Косвенные", "Неэффективность класса"]) await fields.getByLabel(name, { exact: true }).check();
    });
    const pie = await addChart("Donut Chart", structure, "Структура затрат класса", `unpivot_${hex(structure)}_value`, `unpivot_${hex(structure)}_field_name`);
    const classSum = await author.window(base, "Полный итог класса", field(base), ["Класс"]);
    const serviceShare = await author.calc(classSum, "Доля в классе", `safe_divide([${field(base)}], [window_${hex(classSum)}], 0)`);
    const selectedServices = await author.filter(serviceShare, category, "class_name");
    const ordered = await author.sort(selectedServices, [[field(base), "descending"], ["col_39", "ascending"]]);
    const bar = await addChart("Bar Chart", ordered, "Вес услуг в классе", field(base), service);
    await page.getByLabel("Use parameters in title").check();
    await page.getByLabel("Insert title parameter").selectOption("class_name");
    widgets[widgets.length - 1].title += " {class_name}";
    await author.saved();
    const table = await author.table(ordered, "Услуги класса", ["Услуга", "Прямые расходы", "Косвенные расходы", "Неэффективность", "Итого", "Доля в классе"]);
    widgets.push({ id: table, title: "Услуги класса" });
    await page.getByLabel("Format for Доля в классе", { exact: true }).selectOption("percent");
    await page.getByText("Navigation fields", { exact: true }).click();
    const navigation = page.locator("details").filter({ has: page.getByText("Navigation fields", { exact: true }) });
    await navigation.getByLabel("__source_row__", { exact: true }).check();
    await navigation.getByLabel("Класс", { exact: true }).check();
    await author.saved();

    for (const reference of expected.navigation.class_rows) {
      const result = async (id: string) => {
        const response = await request.post(`${api}/api/v1/visualizations/${id}/result`, { data: { parameters: { class_name: reference.name } } });
        expect(response.ok(), await response.text()).toBeTruthy(); return response.json();
      };
      const scalar = async (id: string) => { const data = await result(id); return data.rows[0][data.value_field]; };
      expect(await scalar(className)).toBe(reference.name);
      expect(await scalar(count)).toBe(reference.services_count);
      expect(await scalar(total)).toBeCloseTo(reference.totals.total, 5);
      expect(await scalar(directKpi)).toBeCloseTo(reference.totals.direct, 5);
      expect(await scalar(indirectKpi)).toBeCloseTo(reference.totals.indirect, 5);
      expect(await scalar(shareKpi)).toBeCloseTo(reference.share / 100, 12);
      const structure = await result(pie);
      for (const [index, key] of ["direct", "indirect", "ineff"].entries()) expect(structure.rows[index][structure.value_field]).toBeCloseTo(reference.totals[key], 5);
      const bars = await result(bar), rows = await result(table);
      expect(bars.title).toBe(`Вес услуг в классе {class_name}`.replace("{class_name}", reference.name));
      expect(rows.rows).toHaveLength(reference.services.length);
      expect(bars.rows).toHaveLength(reference.services.length);
      for (const [index, source] of reference.services.entries()) {
        expect(bars.rows[index][bars.category_field]).toBe(source.service_name);
        expect(bars.rows[index][bars.value_field]).toBeCloseTo(source.total_cost, 5);
        const row = rows.rows[index];
        expect(row["Услуга"]).toBe(source.service_name);
        for (const [name, key] of [["Прямые расходы", "direct_cost"], ["Косвенные расходы", "indirect_cost"], ["Неэффективность", "inefficiency_cost"], ["Итого", "total_cost"]]) expect(row[name]).toBeCloseTo(source[key], 5);
        expect(row["Доля в классе"]).toBeCloseTo(reference.totals.total ? source.total_cost / reference.totals.total : 0, 12);
      }
    }
    await page.goto(`/projects/${projectId}/dashboard?dashboard=${overviewId}`);
    await page.getByRole("button", { name: "New dashboard", exact: true }).click();
    await expect(page.getByLabel("Dashboard name")).toHaveValue("Sales dashboard");
    dashboardId = new URL(page.url()).searchParams.get("dashboard")!;
    await page.getByLabel("Dashboard name").fill("Класс");
    for (const widget of widgets) {
      await page.getByLabel("Add visualization", { exact: true }).selectOption(widget.id);
      await page.getByRole("button", { name: "Add widget", exact: true }).click();
    }
    await page.getByText("Dashboard settings", { exact: true }).click();
    await page.getByRole("button", { name: "Add dashboard parameter", exact: true }).click();
    await page.getByLabel("Dashboard parameter name 1").fill("class_name");
    await page.getByLabel("Dashboard parameter label 1").fill("Класс");
    await page.getByLabel("Required parameter", { exact: true }).check();
    await page.getByLabel("Bind workflow parameter 1").selectOption(`${workflowId}:class_name`);
    await page.getByLabel("Choices workflow for class_name").selectOption(workflowId);
    await page.getByLabel("Choices node for class_name").selectOption(base);
    await page.getByLabel("Choices field for class_name").selectOption(category);
    await page.getByRole("button", { name: "Add navigation link", exact: true }).click();
    await page.getByLabel("Navigation link label 1").fill("К общей сводке");
    await page.getByLabel("Destination dashboard").selectOption(overviewId);
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click();
    await author.saved();
    await page.getByLabel("Dashboard", { exact: true }).selectOption(overviewId);
    await page.getByText("Widget navigation", { exact: true }).click();
    for (const title of ["Детализация по классам", "Распределение по классам"]) {
      await page.getByLabel("Configure widget navigation").selectOption({ label: title });
      await page.getByLabel("Destination dashboard").selectOption(dashboardId);
      await page.getByLabel("Navigation value for class_name").selectOption(`field:${category}`);
    }
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click();
    await author.saved();
    const chosen = expected.navigation.class_rows[0].name;
    await page.getByRole("table").getByRole("row").filter({ has: page.getByRole("cell", { name: chosen, exact: true }) }).first().click();
    await expect(page.getByLabel("Dashboard name")).toHaveValue("Класс");
    await expect(page.locator("[data-widget-id]")).toHaveCount(widgets.length);
    await expect(page.getByRole("heading", { name: `Вес услуг в классе ${chosen}`, exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Dashboard selection class_name")).toHaveValue(JSON.stringify(chosen));
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    for (const node of initial.nodes) expect(graph.nodes.find((item: { id: string }) => item.id === node.id)).toEqual(node);
    completed = true;
  } finally {
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    writeFileSync(output, JSON.stringify({ projectId, workflowId, dashboardId, completed, createdNodes: author.created, widgets, graph }, null, 2));
  }
});
