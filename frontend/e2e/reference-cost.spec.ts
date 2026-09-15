import { expect, test } from "@playwright/test";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConstructorAuthor, calculated as field, aggregate as agg, hex } from "./constructor-author";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
const artifactPath = process.env.NODEBI_REFERENCE_SERVICE_PROJECT;
const expectedPath = process.env.NODEBI_REFERENCE_EXPECTED;
const enabled = process.env.NODEBI_REFERENCE_AUTHOR_COST === "1";
const output = resolve("../.backups/reference-cost-project.json");
test.use({ actionTimeout: 20000 });

test("author cost-type overview with ordinary graph totals, leaders and article grouping", async ({ page, request }) => {
  test.skip(!enabled || !artifactPath || !expectedPath, "Opt-in reference cost authoring");
  test.setTimeout(600000);
  const resume = process.env.NODEBI_REFERENCE_RESUME_COST === "1" ? JSON.parse(readFileSync(output, "utf8")) : null;
  if (!resume) expect(existsSync(output), "Review retained cost progress before repeating authoring").toBe(false);
  const previous = JSON.parse(readFileSync(resolve(artifactPath!), "utf8"));
  expect(previous.completed).toBe(true);
  const oracle = JSON.parse(readFileSync(resolve(expectedPath!), "utf8"));
  const { projectId, workflowId } = previous;
  const initial = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
  const named = (name: string) => initial.nodes.find((node: { config: { name?: string } }) => node.config.name === name).id;
  const category = field(named("Класс")), service = field(named("Услуга")), totalField = field(named("Итого"));
  const b = previous.branches as Record<string, string>;
  if (resume) {
    expect(resume.completed).toBe(false); expect(resume.projectId).toBe(projectId);
    const last = initial.nodes.find((node: { id: string }) => node.id === resume.createdNodes.at(-1));
    expect(last).toMatchObject({ type: "table", config: { title: "Классы по виду затрат" } });
    copyFileSync(output, resolve("../.backups/reference-cost-before-resume.json"));
  }
  const author = new ConstructorAuthor(page, resume?.createdNodes ?? []), widgets: { id: string; title: string }[] = [];
  const branches: Record<string, string> = {};
  let dashboardId = "", completed = false;
  const addChart = async (kind: string, upstream: string, title: string, value: string, category?: string, format = "number") => {
    const id = await author.chart(kind, upstream, title, value, category, format); widgets.push({ id, title }); return id;
  };
  const addTable = async (upstream: string, title: string, fields: string[], percents: string[]) => {
    const id = await author.table(upstream, title, fields); widgets.push({ id, title });
    for (const name of percents) await page.getByLabel(`Format for ${name}`, { exact: true }).selectOption("percent");
    await author.saved(); return id;
  };
  const context = async (names: string[]) => {
    await page.getByText("Navigation fields", { exact: true }).click();
    const fields = page.locator("details").filter({ has: page.getByText("Navigation fields", { exact: true }) });
    for (const name of names) await fields.getByLabel(name, { exact: true }).check();
    await author.saved();
  };
  try {
    await page.setViewportSize({ width: 1600, height: 2200 });
    await page.goto(`/projects/${projectId}/workflow`);
    await expect(page.locator(".react-flow__node")).toHaveCount(initial.nodes.length);
    const costNames = await author.rename(b.costs, [[b.costType, "Вид затрат"], [b.costValue, "Сумма вида"]]);
    const scoped = await author.filter(costNames, b.costType, "cost_type");
    branches.scoped = scoped;
    const totals = await author.group(scoped, ["Вид затрат"], [[b.costValue, "sum", "Итого вид затрат"], [totalField, "sum", "Итого все затраты"]]);
    branches.totals = totals;
    const overallShare = await author.calc(totals, "Доля вида в общем итоге", `safe_divide([${agg(totals, 0)}], [${agg(totals, 1)}], 0)`);
    const nameKpi = await addChart("KPI", overallShare, "Выбранный вид затрат", b.costType);
    const totalKpi = await addChart("KPI", overallShare, "Сумма выбранного вида", agg(totals, 0));
    const shareKpi = await addChart("KPI", overallShare, "Доля вида в общей сумме", field(overallShare), undefined, "percent");
    const globalWindow = await author.window(scoped, "Полная сумма вида", b.costValue);
    const servicesShare = await author.calc(globalWindow, "Доля услуги в виде", `safe_divide([${b.costValue}], [window_${hex(globalWindow)}], 0)`);
    const services = await author.sort(servicesShare, [[b.costValue, "descending"], [totalField, "descending"], ["col_39", "ascending"]]);
    branches.services = services;
    const leaderService = await author.limit(services, 1);
    const serviceLeaderKpi = await addChart("KPI", leaderService, "Услуга — лидер вида", service);
    await context(["__source_row__", "Класс"]);
    const classes = await author.group(services, ["Класс"], [[null, "count", "Количество услуг"], [b.costValue, "sum", "Сумма вида в классе"], [totalField, "sum", "Итого затрат класса"]]);
    branches.classes = classes;
    const classWindow = await author.window(classes, "Итог вида по всем классам", agg(classes, 1));
    const classGlobalShare = await author.calc(classWindow, "Доля класса в виде", `safe_divide([${agg(classes, 1)}], [window_${hex(classWindow)}], 0)`);
    const classOwnShare = await author.calc(classGlobalShare, "Доля вида в классе", `safe_divide([${agg(classes, 1)}], [${agg(classes, 2)}], 0)`);
    const orderedClasses = await author.sort(classOwnShare, [[agg(classes, 1), "descending"], [agg(classes, 2), "descending"]]);
    branches.orderedClasses = orderedClasses; branches.classGlobalShare = field(classGlobalShare); branches.classOwnShare = field(classOwnShare);
    const leaderClass = await author.limit(orderedClasses, 1);
    const classLeaderKpi = await addChart("KPI", leaderClass, "Класс — лидер вида", category);
    const positiveClasses = await author.literalFilter(orderedClasses, agg(classes, 1), "greater_than", "0");
    const classPie = await addChart("Donut Chart", positiveClasses, "Распределение вида по классам", agg(classes, 1), category);
    const positiveServices = await author.literalFilter(services, b.costValue, "greater_than", "0");
    const serviceTop = await author.limit(positiveServices, 25);
    const serviceBar = await addChart("Bar Chart", serviceTop, "Топ услуг по виду затрат", b.costValue, service);
    await context(["__source_row__", "Класс"]);
    const classTable = await addTable(orderedClasses, "Классы по виду затрат", ["Класс", "Количество услуг", "Сумма вида в классе", "Доля класса в виде", "Доля вида в классе"], ["Доля класса в виде", "Доля вида в классе"]);
    const serviceTable = await addTable(services, "Услуги по виду затрат", ["Класс", "Услуга", "Сумма вида", "Доля услуги в виде", "Доля вида в услуге"], ["Доля услуги в виде", "Доля вида в услуге"]);
    await context(["__source_row__"]);
    const articleScope = await author.filter(b.articles, b.articleType, "cost_type");
    branches.articleScope = articleScope;
    const articleTotals = await author.group(articleScope, ["Тип", "Идентификатор статьи", "Статья"], [[b.articleValue, "sum", "Итого статьи"]]);
    const articleJoin = await author.join(articleTotals, totals, b.articleType, b.costType);
    const articleShare = await author.calc(articleJoin, "Доля статьи в виде", `safe_divide([${agg(articleTotals, 0)}], [join_${hex(articleJoin)}_right_${agg(totals, 0)}], 0)`);
    const articles = await author.sort(articleShare, [[agg(articleTotals, 0), "descending"]]);
    branches.articles = articles; branches.articleTotal = agg(articleTotals, 0);
    const positiveArticles = await author.literalFilter(articles, agg(articleTotals, 0), "greater_than", "0");
    const articleTop = await author.limit(positiveArticles, 15);
    const articleBar = await addChart("Bar Chart", articleTop, "Топ статей вида затрат", agg(articleTotals, 0), b.articleName);

    for (const reference of oracle.screens.cost) {
      const scope = reference.cost_scope;
      const result = async (id: string) => {
        const response = await request.post(`${api}/api/v1/visualizations/${id}/result`, { data: { parameters: { cost_type: reference.cost_meta.title } } });
        expect(response.ok(), await response.text()).toBeTruthy(); return response.json();
      };
      const scalar = async (id: string) => { const data = await result(id); return data.rows[0][data.value_field]; };
      expect(await scalar(nameKpi)).toBe(reference.cost_meta.title);
      expect(await scalar(totalKpi)).toBeCloseTo(scope.selected_total, 5);
      expect(await scalar(shareKpi)).toBeCloseTo(scope.share_of_scope / 100, 12);
      expect(await scalar(serviceLeaderKpi)).toBe(scope.top_service_name);
      expect(await scalar(classLeaderKpi)).toBe(scope.top_class_name);
      const classRows = await result(classTable), serviceRows = await result(serviceTable);
      expect(classRows.rows).toHaveLength(scope.class_rows.length);
      classRows.rows.forEach((row: Record<string, unknown>, index: number) => {
        const source = scope.class_rows[index];
        expect(row["Класс"]).toBe(source.class_name); expect(row["Количество услуг"]).toBe(source.services_count);
        expect(row["Сумма вида в классе"]).toBeCloseTo(source.value, 5);
        expect(row["Доля класса в виде"]).toBeCloseTo(source.share_in_scope / 100, 12);
        expect(row["Доля вида в классе"]).toBeCloseTo(source.share_in_class / 100, 12);
      });
      expect(serviceRows.rows).toHaveLength(scope.service_rows.length);
      serviceRows.rows.forEach((row: Record<string, unknown>, index: number) => {
        const source = scope.service_rows[index];
        expect(row["Класс"]).toBe(source.class_name); expect(row["Услуга"]).toBe(source.service_name);
        expect(row["Сумма вида"]).toBeCloseTo(source.value, 5);
        expect(row["Доля услуги в виде"]).toBeCloseTo(source.share_in_scope / 100, 12);
        expect(row["Доля вида в услуге"]).toBeCloseTo(source.share_in_service / 100, 12);
      });
      for (const [id, sourceRows, label] of [
        [classPie, scope.class_rows.filter((row: { value: number }) => row.value > 0), "class_name"],
        [serviceBar, scope.service_rows.filter((row: { value: number }) => row.value > 0).slice(0, 25), "service_name"],
        [articleBar, scope.component_rows.filter((row: { value: number }) => row.value > 0).slice(0, 15), "component"],
      ] as const) {
        const chart = await result(id);
        expect(chart.rows).toHaveLength(sourceRows.length);
        chart.rows.forEach((row: Record<string, unknown>, index: number) => {
          expect(row[chart.category_field]).toBe(sourceRows[index][label]);
          expect(row[chart.value_field]).toBeCloseTo(sourceRows[index].value, 5);
        });
      }
    }
    const overview = JSON.parse(readFileSync(resolve("../.backups/reference-overview-project.json"), "utf8"));
    const overviewId = overview.dashboards.items[0].id;
    await page.goto(`/projects/${projectId}/dashboard?dashboard=${overviewId}`);
    await page.getByRole("button", { name: "New dashboard", exact: true }).click();
    await expect(page.getByLabel("Dashboard name")).toHaveValue("Sales dashboard");
    dashboardId = new URL(page.url()).searchParams.get("dashboard")!;
    await page.getByLabel("Dashboard name").fill("Вид затрат");
    for (const widget of widgets) {
      await page.getByLabel("Add visualization", { exact: true }).selectOption(widget.id);
      await page.getByRole("button", { name: "Add widget", exact: true }).click();
    }
    await page.getByText("Dashboard settings", { exact: true }).click();
    await page.getByRole("button", { name: "Add dashboard parameter", exact: true }).click();
    await page.getByLabel("Dashboard parameter name 1").fill("cost_type");
    await page.getByLabel("Dashboard parameter label 1").fill("Вид затрат");
    await page.getByLabel("Required parameter", { exact: true }).check();
    await page.getByLabel("Bind workflow parameter 1").selectOption(`${workflowId}:cost_type`);
    await page.getByLabel("Choices workflow for cost_type").selectOption(workflowId);
    await page.getByLabel("Choices node for cost_type").selectOption(costNames);
    await page.getByLabel("Choices field for cost_type").selectOption(b.costType);
    await page.getByRole("button", { name: "Add navigation link", exact: true }).click();
    await page.getByLabel("Navigation link label 1").fill("К общей сводке");
    await page.getByLabel("Destination dashboard").selectOption(overviewId);
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await author.saved();
    await page.goto(`/projects/${projectId}/dashboard?dashboard=${dashboardId}&parameters=${encodeURIComponent(JSON.stringify({ cost_type: oracle.screens.cost[0].cost_meta.title }))}`);
    await expect(page.locator("[data-widget-id]")).toHaveCount(widgets.length);
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel("Dashboard selection cost_type")).toHaveValue(JSON.stringify(oracle.screens.cost[0].cost_meta.title));
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    for (const node of previous.graph.nodes) expect(graph.nodes.find((item: { id: string }) => item.id === node.id)).toEqual(node);
    completed = true;
  } finally {
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    const createdNodes = [...new Set([...(resume?.createdNodes ?? []), ...author.created])];
    writeFileSync(output, JSON.stringify({ projectId, workflowId, dashboardId, completed, branches: { ...resume?.branches, ...branches }, createdNodes, widgets, graph }, null, 2));
  }
});
