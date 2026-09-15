import { expect, test } from "@playwright/test";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConstructorAuthor, calculated as field, hex } from "./constructor-author";
import { authorDashboard, widgetAction } from "./dashboard-author";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
const enabled = process.env.NODEBI_REFERENCE_AUTHOR_COST_SERVICE === "1";
const output = resolve("../.backups/reference-cost-service-project.json");
test.use({ actionTimeout: 20000 });

test("author service cost detail and compare all 108 slices, ranks and peer records", async ({ page, request }) => {
  test.skip(!enabled, "Opt-in private service-cost authoring");
  test.setTimeout(600000);
  const resume = process.env.NODEBI_REFERENCE_RESUME_COST_SERVICE === "1" ? JSON.parse(readFileSync(output, "utf8")) : null;
  if (!resume) expect(existsSync(output), "Review retained progress before repeating authoring").toBe(false);
  const load = (name: string) => JSON.parse(readFileSync(resolve(`../.backups/${name}.json`), "utf8"));
  const previous = load("reference-cost-class-project"), costProject = load("reference-cost-project"), serviceProject = load("reference-service-project"), oracle = load("opop-expected");
  expect(previous.completed).toBe(true);
  const { projectId, workflowId } = previous;
  const initial = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
  const named = (name: string) => initial.nodes.find((node: { config: { name?: string } }) => node.config.name === name).id;
  const category = field(named("Класс")), service = field(named("Услуга")), base = named("Итого");
  const c = previous.branches as Record<string, string>, b = serviceProject.branches as Record<string, string>, g = costProject.branches as Record<string, string>;
  if (resume) {
    expect(resume.completed).toBe(false); expect(resume.projectId).toBe(projectId); expect(resume.createdNodes).toHaveLength(8);
    expect(initial.nodes.find((node: { id: string }) => node.id === resume.createdNodes.at(-1))).toMatchObject({ type: "table" });
    copyFileSync(output, resolve("../.backups/reference-cost-service-before-resume.json"));
  }
  const author = new ConstructorAuthor(page, resume?.createdNodes ?? []), widgets: { id: string; title: string }[] = [];
  let completed = false, dashboardId = "";
  const chart = async (kind: string, upstream: string, title: string, value: string, category?: string, format = "number", decimals = 2) => {
    const id = await author.chart(kind, upstream, title, value, category, format, decimals); widgets.push({ id, title }); return id;
  };
  const table = async (upstream: string, title: string, names: string[]) => {
    const id = await author.table(upstream, title, names); widgets.push({ id, title }); return id;
  };
  const highlight = async () => {
    await page.getByText("Highlight selection", { exact: true }).click();
    await page.getByLabel("Highlight field", { exact: true }).selectOption("col_39");
    await page.getByLabel("Highlight parameter", { exact: true }).selectOption("service_id");
    await page.getByText("Navigation fields", { exact: true }).click();
    const fields = page.locator("details").filter({ has: page.getByText("Navigation fields", { exact: true }) });
    await fields.getByLabel("Класс", { exact: true }).check(); await author.saved();
  };
  try {
    await page.setViewportSize({ width: 1600, height: 2200 });
    await page.goto(`/projects/${projectId}/workflow`);
    await expect(page.locator(".react-flow__node")).toHaveCount(initial.nodes.length);
    const selected = await author.filter(c.services, "col_39", "service_id");
    const serviceName = await chart("KPI", selected, "Услуга выбранного вида", service);
    const className = await chart("KPI", selected, "Класс выбранной услуги", category);
    const amount = await chart("KPI", selected, "Сумма вида затрат услуги", b.costValue);
    await page.getByLabel("Use parameters in title").check(); await page.getByLabel("Chart title", { exact: true }).fill("Сумма вида затрат услуги {cost_type}");
    widgets[widgets.length - 1].title += " {cost_type}"; await author.saved();
    const shareField = initial.nodes.find((node: { config: { name?: string } }) => node.config.name === "Доля вида в услуге").id;
    const share = await chart("KPI", selected, "Доля вида в сумме услуги", field(shareField), undefined, "percent", 1);
    const rank = await chart("KPI", selected, "Место услуги в классе по виду", c.serviceRank, undefined, "number", 0);
    const count = previous.widgets.find((item: { title: string }) => item.title === "Количество услуг класса"); widgets.push(count);
    const peers = await chart("Bar Chart", c.services, "Сравнение услуг класса по виду", b.costValue, service); await highlight();
    const peerTable = await table(c.services, "Другие услуги класса по виду", ["Услуга", "Сумма вида"]); await highlight();
    const articleJoin = await author.join(g.articleScope, g.scoped, "col_39", "col_39");
    const articleShares = await author.calc(articleJoin, "Доля статьи в виде услуги", `safe_divide([${b.articleValue}], [join_${hex(articleJoin)}_right_${b.costValue}], 0)`);
    const scopedArticles = await author.filter(await author.filter(articleShares, category, "class_name"), "col_39", "service_id");
    const nonzero = await author.literalFilter(scopedArticles, b.articleValue, "not_equals", "0");
    const sortedArticles = await author.sort(nonzero, [[b.articleValue, "descending"]]);
    const articles = await table(sortedArticles, "Детальные статьи вида услуги", ["Статья", "Сумма статьи", "Доля статьи в виде услуги"]);
    await page.getByLabel("Format for Доля статьи в виде услуги", { exact: true }).selectOption("percent");
    await page.getByLabel("Decimals for Доля статьи в виде услуги", { exact: true }).fill("1"); await author.saved();
    const pie = await chart("Bar Chart", sortedArticles, "Состав вида затрат услуги", b.articleValue, b.articleName);
    const previewResponse = await request.post(`${api}/api/v1/workflows/${workflowId}/nodes/${base}/preview`, { data: { limit: 100 } });
    expect(previewResponse.ok()).toBeTruthy(); const allServices = await previewResponse.json();
    const rowId = (source: { class_name: string; service_name: string }) => {
      const matches = allServices.rows.filter((row: Record<string, unknown>) => row["Класс"] === source.class_name && row["Услуга"] === source.service_name);
      expect(matches).toHaveLength(1); return matches[0].__source_row__ as number;
    };
    for (const reference of oracle.screens.cost_service) {
      const source = reference.service, selectedId = rowId(source);
      const result = async (id: string) => {
        const response = await request.post(`${api}/api/v1/visualizations/${id}/result`, { data: { parameters: { cost_type: reference.cost_meta.title, class_name: source.class_name, service_id: selectedId } } });
        expect(response.ok(), await response.text()).toBeTruthy(); return response.json();
      };
      const scalar = async (id: string) => { const data = await result(id); return data.rows[0][data.value_field]; };
      expect(await scalar(serviceName)).toBe(source.service_name); expect(await scalar(className)).toBe(source.class_name);
      expect(await scalar(amount)).toBeCloseTo(reference.selected_value, 5);
      expect(await scalar(share)).toBeCloseTo(reference.selected_share / 100, 12);
      expect(await scalar(rank)).toBe(reference.ranking); expect(await scalar(count.id)).toBe(reference.peer_rows.length);
      for (const id of [peers, peerTable]) {
        const data = await result(id); expect(data.rows).toHaveLength(reference.peer_rows.length);
        data.rows.forEach((row: Record<string, unknown>, index: number) => {
          expect(row["Услуга"]).toBe(reference.peer_rows[index].service_name);
          expect(row["Сумма вида"]).toBeCloseTo(reference.peer_rows[index].value, 5);
          expect(row[data.highlight_field] === data.highlight_value).toBe(reference.peer_rows[index].is_current);
        });
      }
      for (const id of [articles, pie]) {
        const data = await result(id); expect(data.rows).toHaveLength(reference.detail_rows.length);
        data.rows.forEach((row: Record<string, unknown>, index: number) => {
          expect(row["Статья"]).toBe(reference.detail_rows[index].component);
          expect(row["Сумма статьи"]).toBeCloseTo(reference.detail_rows[index].value, 5);
          if (id === articles) expect(row["Доля статьи в виде услуги"]).toBeCloseTo(reference.detail_rows[index].share / 100, 12);
        });
      }
    }
    dashboardId = await authorDashboard(page, projectId, workflowId, "Вид затрат услуги", widgets.map(item => item.id), [
      { name: "cost_type", label: "Вид затрат", type: "string", node: b.costs, column: b.costType },
      { name: "class_name", label: "Класс", type: "string", node: base, column: category },
      { name: "service_id", label: "Номер исходной строки услуги", type: "integer", node: c.services, column: "col_39" },
    ], [
      { label: "К услуге", target: serviceProject.dashboardId, values: { class_name: "parameter:class_name", service_id: "parameter:service_id" } },
      { label: "К виду затрат в классе", target: previous.dashboardId, values: { class_name: "parameter:class_name", cost_type: "parameter:cost_type" } },
      { label: "К виду затрат", target: costProject.dashboardId, values: { cost_type: "parameter:cost_type" } },
    ]);
    const sample = oracle.screens.cost_service[0];
    const values = { cost_type: sample.cost_meta.title, class_name: sample.service.class_name, service_id: rowId(sample.service) };
    await page.goto(`/projects/${projectId}/dashboard?dashboard=${dashboardId}&parameters=${encodeURIComponent(JSON.stringify(values))}`);
    for (const title of ["Сравнение услуг класса по виду", "Другие услуги класса по виду"]) await widgetAction(page, title, dashboardId, { class_name: `field:${category}`, service_id: "field:col_39", cost_type: "parameter:cost_type" });
    await page.goto(`/projects/${projectId}/dashboard?dashboard=${previous.dashboardId}&parameters=${encodeURIComponent(JSON.stringify({ cost_type: values.cost_type, class_name: values.class_name }))}`);
    for (const title of ["Вид затрат по услугам класса", "Услуги класса по виду затрат"]) await widgetAction(page, title, dashboardId, { class_name: `field:${category}`, service_id: "field:col_39", cost_type: "parameter:cost_type" });
    await page.goto(`/projects/${projectId}/dashboard?dashboard=${costProject.dashboardId}&parameters=${encodeURIComponent(JSON.stringify({ cost_type: values.cost_type }))}`);
    for (const title of ["Топ услуг по виду затрат", "Услуги по виду затрат", "Услуга — лидер вида"]) await widgetAction(page, title, dashboardId, { class_name: `field:${category}`, service_id: "field:col_39", cost_type: "parameter:cost_type" });
    await page.goto(`/projects/${projectId}/dashboard?dashboard=${serviceProject.dashboardId}&parameters=${encodeURIComponent(JSON.stringify({ class_name: values.class_name, service_id: values.service_id }))}`);
    await widgetAction(page, "Виды затрат услуги", dashboardId, { class_name: "parameter:class_name", service_id: "parameter:service_id", cost_type: `field:${b.costType}` });
    const serviceDashboard = await (await request.get(`${api}/api/v1/dashboards/${serviceProject.dashboardId}`)).json();
    const costWidget = serviceDashboard.widgets.find((item: { visualization_id: string }) => item.visualization_id === serviceProject.widgets.find((item: { title: string }) => item.title === "Виды затрат услуги").id);
    await page.locator(`[data-widget-id="${costWidget.id}"]`).getByRole("table").locator("tbody tr").first().click();
    await expect(page.getByLabel("Dashboard name")).toHaveValue("Вид затрат услуги");
    await page.reload();
    await expect(page.locator('[data-testid="kpi-value"]')).toHaveCount(6);
    await expect(page.getByRole("table")).toHaveCount(2);
    await expect(page.getByText(/Loading visualization/)).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    for (const node of previous.graph.nodes) expect(graph.nodes.find((item: { id: string }) => item.id === node.id)).toEqual(node);
    completed = true;
  } finally {
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    const createdNodes = [...new Set([...(resume?.createdNodes ?? []), ...author.created])];
    writeFileSync(output, JSON.stringify({ projectId, workflowId, dashboardId, completed, createdNodes, widgets, graph }, null, 2));
  }
});
