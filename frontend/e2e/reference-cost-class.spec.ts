import { expect, test } from "@playwright/test";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConstructorAuthor, calculated as field, aggregate as agg, hex } from "./constructor-author";
import { authorDashboard, widgetAction } from "./dashboard-author";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
const enabled = process.env.NODEBI_REFERENCE_AUTHOR_COST_CLASS === "1";
const output = resolve("../.backups/reference-cost-class-project.json");
test.use({ actionTimeout: 20000 });

test("author cost/class ranks, service shares and article detail through the constructor", async ({ page, request }) => {
  test.skip(!enabled, "Opt-in private cost/class authoring");
  test.setTimeout(600000);
  const resume = process.env.NODEBI_REFERENCE_RESUME_COST_CLASS === "1" ? JSON.parse(readFileSync(output, "utf8")) : null;
  if (!resume) expect(existsSync(output), "Review retained progress before repeating authoring").toBe(false);
  const load = (name: string) => JSON.parse(readFileSync(resolve(`../.backups/${name}.json`), "utf8"));
  const previous = load("reference-cost-project"), serviceProject = load("reference-service-project"), overview = load("reference-overview-project"), classProject = load("reference-class-project"), oracle = load("opop-expected");
  expect(previous.completed).toBe(true);
  const { projectId, workflowId } = previous;
  const initial = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
  const named = (name: string) => initial.nodes.find((node: { config: { name?: string } }) => node.config.name === name).id;
  const category = field(named("Класс")), service = field(named("Услуга")), total = field(named("Итого"));
  const c = previous.branches as Record<string, string>, b = serviceProject.branches as Record<string, string>;
  if (resume) {
    expect(resume.projectId).toBe(projectId); expect(resume.createdNodes).toHaveLength(1);
    expect(initial.nodes.find((node: { id: string }) => node.id === resume.createdNodes[0])).toMatchObject({ type: "window", config: { name: "Ранг класса по виду" } });
    copyFileSync(output, resolve("../.backups/reference-cost-class-before-resume.json"));
  }
  const author = new ConstructorAuthor(page, resume?.createdNodes ?? []), widgets: { id: string; title: string }[] = [], branches: Record<string, string> = {};
  let completed = false, dashboardId = "";
  const chart = async (kind: string, upstream: string, title: string, value: string, category?: string, format = "number", decimals = 2) => {
    const id = await author.chart(kind, upstream, title, value, category, format, decimals); widgets.push({ id, title }); return id;
  };
  const table = async (upstream: string, title: string, fields: string[], percents: string[]) => {
    const id = await author.table(upstream, title, fields); widgets.push({ id, title });
    for (const name of percents) { await page.getByLabel(`Format for ${name}`, { exact: true }).selectOption("percent"); await page.getByLabel(`Decimals for ${name}`, { exact: true }).fill("1"); }
    await author.saved(); return id;
  };
  try {
    await page.setViewportSize({ width: 1600, height: 2200 });
    await page.goto(`/projects/${projectId}/workflow`);
    await expect(page.locator(".react-flow__node")).toHaveCount(initial.nodes.length);
    const rankedClasses = await author.rank(c.orderedClasses, "Ранг класса по виду", [], [[agg(c.classes, 1), "descending"], [agg(c.classes, 2), "descending"], [category, "ascending"]]);
    const selectedClass = await author.filter(rankedClasses, category, "class_name");
    branches.classSelected = selectedClass;
    const amount = await chart("KPI", selectedClass, "Вид затрат в классе", agg(c.classes, 1));
    await page.getByLabel("Use parameters in title").check();
    await page.getByLabel("Insert title parameter").selectOption("cost_type");
    await page.getByLabel("Insert title parameter").selectOption("class_name");
    widgets[widgets.length - 1].title += " {cost_type} {class_name}"; await author.saved();
    const share = await chart("KPI", selectedClass, "Доля класса в сумме вида", c.classGlobalShare, undefined, "percent", 1);
    const rank = await chart("KPI", selectedClass, "Ранг класса по виду затрат", `window_${hex(rankedClasses)}`, undefined, "number", 0);
    const count = await chart("KPI", selectedClass, "Количество услуг класса", agg(c.classes, 0), undefined, "number", 0);
    const allClassCount = overview.widgets.find((item: { title: string }) => item.title === "Всего классов");
    widgets.push(allClassCount);
    const classWindow = await author.window(c.scoped, "Итог вида внутри класса", b.costValue, ["Класс"]);
    const serviceShare = await author.calc(classWindow, "Доля услуги в виде класса", `safe_divide([${b.costValue}], [window_${hex(classWindow)}], 0)`);
    const serviceRanks = await author.rank(serviceShare, "Место услуги по виду", ["Класс"], [[b.costValue, "descending"], [total, "descending"], ["col_39", "ascending"]]);
    branches.rankedServices = serviceRanks;
    const classServices = await author.filter(serviceRanks, category, "class_name");
    const sortedServices = await author.sort(classServices, [[b.costValue, "descending"], [total, "descending"], ["col_39", "ascending"]]);
    branches.services = sortedServices; branches.serviceRank = `window_${hex(serviceRanks)}`;
    const positiveServices = await author.literalFilter(sortedServices, b.costValue, "greater_than", "0");
    const serviceBar = await chart("Bar Chart", positiveServices, "Вид затрат по услугам класса", b.costValue, service);
    await page.getByText("Navigation fields", { exact: true }).click();
    const fields = page.locator("details").filter({ has: page.getByText("Navigation fields", { exact: true }) });
    await fields.getByLabel("__source_row__", { exact: true }).check(); await fields.getByLabel("Класс", { exact: true }).check(); await author.saved();
    const serviceTable = await table(sortedServices, "Услуги класса по виду затрат", ["Услуга", "Сумма вида", "Доля услуги в виде класса", "Доля вида в услуге"], ["Доля услуги в виде класса", "Доля вида в услуге"]);
    await page.getByText("Navigation fields", { exact: true }).click();
    await fields.getByLabel("__source_row__", { exact: true }).check(); await fields.getByLabel("Класс", { exact: true }).check(); await author.saved();
    const articleTotals = await author.group(c.articleScope, ["Класс", "Идентификатор статьи", "Статья"], [[b.articleValue, "sum", "Сумма статьи класса"]]);
    const joined = await author.join(articleTotals, c.classes, category, category);
    const articleShares = await author.calc(joined, "Доля статьи в виде класса", `safe_divide([${agg(articleTotals, 0)}], [join_${hex(joined)}_right_${agg(c.classes, 1)}], 0)`);
    const articles = await author.sort(await author.filter(articleShares, category, "class_name"), [[agg(articleTotals, 0), "descending"]]);
    const articleTable = await table(articles, "Статьи вида затрат в классе", ["Статья", "Сумма статьи класса", "Доля статьи в виде класса"], ["Доля статьи в виде класса"]);
    const positiveArticles = await author.literalFilter(articles, agg(articleTotals, 0), "greater_than", "0");
    const articlePie = await chart("Bar Chart", await author.limit(positiveArticles, 15), "Структура статей вида в классе", agg(articleTotals, 0), b.articleName);
    for (const reference of oracle.screens.cost_class) {
      const scope = reference.cost_scope;
      const result = async (id: string) => {
        const response = await request.post(`${api}/api/v1/visualizations/${id}/result`, { data: { parameters: { cost_type: reference.cost_meta.title, class_name: reference.class_row.name } } });
        expect(response.ok(), await response.text()).toBeTruthy(); return response.json();
      };
      const scalar = async (id: string) => { const data = await result(id); return data.rows[0][data.value_field]; };
      expect(await scalar(amount)).toBeCloseTo(scope.selected_total, 5);
      expect(await scalar(share)).toBeCloseTo(reference.class_share_global / 100, 12);
      expect(await scalar(rank)).toBe(reference.class_rank); expect(await scalar(count)).toBe(reference.class_row.services_count);
      expect(await scalar(allClassCount.id)).toBe(oracle.navigation.class_rows.length);
      const rows = await result(serviceTable), details = await result(articleTable);
      expect(rows.rows).toHaveLength(scope.service_rows.length);
      rows.rows.forEach((row: Record<string, unknown>, index: number) => {
        const source = scope.service_rows[index]; expect(row["Услуга"]).toBe(source.service_name);
        expect(row["Сумма вида"]).toBeCloseTo(source.value, 5);
        expect(row["Доля услуги в виде класса"]).toBeCloseTo(source.share_in_scope / 100, 12);
        expect(row["Доля вида в услуге"]).toBeCloseTo(source.share_in_service / 100, 12);
      });
      expect(details.rows).toHaveLength(scope.component_rows.length);
      details.rows.forEach((row: Record<string, unknown>, index: number) => {
        expect(row["Статья"]).toBe(scope.component_rows[index].component);
        expect(row["Сумма статьи класса"]).toBeCloseTo(scope.component_rows[index].value, 5);
        expect(row["Доля статьи в виде класса"]).toBeCloseTo(scope.component_rows[index].share_in_scope / 100, 12);
      });
      for (const [id, data, label] of [[serviceBar, scope.service_rows.filter((row: { value: number }) => row.value > 0), "service_name"], [articlePie, scope.component_rows.filter((row: { value: number }) => row.value > 0).slice(0, 15), "component"]] as const) {
        const resultChart = await result(id); expect(resultChart.rows).toHaveLength(data.length);
        resultChart.rows.forEach((row: Record<string, unknown>, index: number) => { expect(row[resultChart.category_field]).toBe(data[index][label]); expect(row[resultChart.value_field]).toBeCloseTo(data[index].value, 5); });
      }
    }
    dashboardId = await authorDashboard(page, projectId, workflowId, "Вид затрат в классе", widgets.map(item => item.id), [
      { name: "cost_type", label: "Вид затрат", type: "string", node: b.costs, column: b.costType },
      { name: "class_name", label: "Класс", type: "string", node: named("Итого"), column: category },
    ], [
      { label: "К виду затрат", target: previous.dashboardId, values: { cost_type: "parameter:cost_type" } },
      { label: "К классу", target: classProject.dashboardId, values: { class_name: "parameter:class_name" } },
    ]);
    const chosenCost = oracle.screens.cost[0].cost_meta.title;
    await page.goto(`/projects/${projectId}/dashboard?dashboard=${previous.dashboardId}&parameters=${encodeURIComponent(JSON.stringify({ cost_type: chosenCost }))}`);
    for (const title of ["Классы по виду затрат", "Распределение вида по классам", "Класс — лидер вида"]) await widgetAction(page, title, dashboardId, { cost_type: "parameter:cost_type", class_name: `field:${category}` });
    const targetWidget = await (await request.get(`${api}/api/v1/dashboards/${previous.dashboardId}`)).json();
    const tableId = targetWidget.widgets.find((item: { visualization_id: string }) => item.visualization_id === previous.widgets.find((item: { title: string }) => item.title === "Классы по виду затрат").id).id;
    await page.locator(`[data-widget-id="${tableId}"]`).getByRole("table").locator("tbody tr").first().click();
    await expect(page.getByLabel("Dashboard name")).toHaveValue("Вид затрат в классе");
    await page.reload(); await expect(page.locator("[data-widget-id]")).toHaveCount(widgets.length);
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    for (const node of previous.graph.nodes) expect(graph.nodes.find((item: { id: string }) => item.id === node.id)).toEqual(node);
    completed = true;
  } finally {
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    writeFileSync(output, JSON.stringify({ projectId, workflowId, dashboardId, completed, branches, createdNodes: author.created, widgets, graph }, null, 2));
  }
});
