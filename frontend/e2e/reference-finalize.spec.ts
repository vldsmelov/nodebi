import { expect, test } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConstructorAuthor, calculated as field, hex } from "./constructor-author";
import { widgetAction } from "./dashboard-author";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
const enabled = process.env.NODEBI_REFERENCE_FINALIZE === "1";
const output = resolve("../.backups/reference-finalized-project.json");
test.use({ actionTimeout: 20000 });

test("finish six-screen navigation and reference display precision through UI", async ({ page, request }) => {
  test.skip(!enabled, "Opt-in final reference configuration");
  test.setTimeout(600000);
  expect(existsSync(output), "Finalization already recorded; review rather than duplicate").toBe(false);
  const load = (name: string) => JSON.parse(readFileSync(resolve(`../.backups/${name}.json`), "utf8"));
  const overview = load("reference-overview-project"), classes = load("reference-class-project"), services = load("reference-service-project"), costs = load("reference-cost-project"), costClass = load("reference-cost-class-project"), costService = load("reference-cost-service-project"), oracle = load("opop-expected");
  for (const project of [classes, services, costs, costClass, costService]) expect(project.completed).toBe(true);
  const { projectId, workflowId } = costService;
  const getGraph = async () => (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
  const original = await getGraph();
  const originalDashboards = await (await request.get(`${api}/api/v1/projects/${projectId}/dashboards`)).json();
  const backup = resolve("../.backups/before-reference-finalization.json");
  if (!existsSync(backup)) writeFileSync(backup, JSON.stringify({ graph: original, dashboards: originalDashboards }, null, 2));
  const named = (name: string) => original.nodes.find((node: { config: { name?: string } }) => node.config.name === name).id;
  const category = field(named("Класс"));
  const visual = (project: typeof overview, title: string): string => project.widgets.find((item: { title: string }) => item.title === title).id;
  const upstream = (id: string): string => original.edges.find((edge: { target_node_id: string }) => edge.target_node_id === id).source_node_id;
  const author = new ConstructorAuthor(page);
  const rewire = async (node: string, source: string) => {
    await author.selectNode(node);
    const input = page.getByLabel("Input input", { exact: true });
    if (await input.inputValue() !== `${source}:dataset`) {
      await input.selectOption(""); await input.selectOption(`${source}:dataset`); await author.saved();
    }
  };
  const ensureRename = async (source: string, rules: [string, string][]) => {
    const matches = (node: { type: string; config: { renames?: { column_id: string; new_name: string }[] } }) => node.type === "rename_columns" && node.config.renames?.length === rules.length && node.config.renames.every((rule, index) => rule.column_id === rules[index][0] && rule.new_name === rules[index][1]);
    const parent = original.nodes.find((node: { id: string }) => node.id === source);
    if (matches(parent)) return source;
    const existing = original.nodes.find((node: { id: string; type: string; config: { renames?: { column_id: string; new_name: string }[] } }) => matches(node) && original.edges.some((edge: { source_node_id: string; target_node_id: string }) => edge.source_node_id === source && edge.target_node_id === node.id));
    return existing?.id ?? author.rename(source, rules);
  };
  await page.setViewportSize({ width: 1600, height: 2200 });
  await page.goto(`/projects/${projectId}/workflow`);
  await expect(page.locator(".react-flow__node")).toHaveCount(original.nodes.length);
  const overviewPie = visual(overview, "Структура затрат"), classPie = visual(classes, "Структура затрат класса");
  const longNodes: string[] = [];
  for (const pie of [overviewPie, classPie]) {
    const long = upstream(pie); longNodes.push(long);
    const source = upstream(long), columns = original.nodes.find((node: { id: string }) => node.id === long).config.columns as string[];
    expect(columns).toHaveLength(3);
    const rename = await ensureRename(source, columns.map((column, index) => [column, ["Прямые расходы", "Косвенные расходы", "Неэффективность"][index]]));
    await rewire(long, rename);
  }
  const costsTable = visual(services, "Виды затрат услуги");
  const labelCosts = await ensureRename(upstream(costsTable), [[services.branches.costType, "Вид затрат"], [services.branches.costValue, "Сумма"]]);
  await rewire(costsTable, labelCosts);
  const overviewServices = visual(overview, "Топ услуг (до 40)");
  const classBar = visual(classes, "Вес услуг в классе {class_name}");
  for (const id of [overviewServices, classBar]) {
    await author.selectNode(id); await page.getByText("Navigation fields", { exact: true }).click();
    const fields = page.locator("details").filter({ has: page.getByText("Navigation fields", { exact: true }) });
    await fields.getByLabel("__source_row__", { exact: true }).check(); await fields.getByLabel("Класс", { exact: true }).check(); await author.saved();
  }
  const graph = await getGraph(), schema = await (await request.get(`${api}/api/v1/workflows/${workflowId}/schema`)).json();
  expect(schema.valid).toBe(true);
  for (const node of graph.nodes) {
    const columns = schema.nodes.find((item: { node_id: string }) => item.node_id === node.id)?.columns ?? [];
    if (node.type === "table") {
      const selected = node.config.column_ids ?? columns.map((column: { column_id: string }) => column.column_id);
      const changes = columns.filter((column: { column_id: string; logical_type: string }) => {
        if (!selected.includes(column.column_id)) return false;
        const settings = node.config.column_formats?.[column.column_id];
        return settings?.number_format === "percent" ? settings.decimals !== 1 : column.logical_type === "integer" && (settings?.decimals ?? node.config.decimals ?? 2) !== 0;
      });
      if (!changes.length) continue;
      await author.selectNode(node.id);
      for (const column of changes) {
        const percent = node.config.column_formats?.[column.column_id]?.number_format === "percent";
        await page.getByLabel(`Format for ${column.display_name}`, { exact: true }).selectOption(percent ? "percent" : "number");
        await page.getByLabel(`Decimals for ${column.display_name}`, { exact: true }).fill(percent ? "1" : "0");
      }
      await author.saved();
    } else if (node.type === "kpi") {
      const column = columns.find((column: { column_id: string }) => column.column_id === node.config.value_column_id);
      const desired = node.config.number_format === "percent" ? 1 : column?.logical_type === "integer" ? 0 : 2;
      if ((node.config.decimals ?? 2) !== desired) { await author.selectNode(node.id); await page.getByLabel("Decimal places", { exact: true }).fill(String(desired)); await author.saved(); }
    }
  }
  const sample = oracle.navigation.class_rows[0], classValues = { class_name: sample.name };
  const overviewId = overview.dashboards.items[0].id;
  await page.goto(`/projects/${projectId}/dashboard?dashboard=${overviewId}`);
  await widgetAction(page, "Структура затрат", costs.dashboardId, { cost_type: `field:unpivot_${hex(longNodes[0])}_field_name` });
  await widgetAction(page, "Топ услуг (до 40)", services.dashboardId, { class_name: `field:${category}`, service_id: "field:col_39" });
  await page.goto(`/projects/${projectId}/dashboard?dashboard=${classes.dashboardId}&parameters=${encodeURIComponent(JSON.stringify(classValues))}`);
  await widgetAction(page, "Структура затрат класса", costClass.dashboardId, { class_name: "parameter:class_name", cost_type: `field:unpivot_${hex(longNodes[1])}_field_name` });
  await widgetAction(page, "Вес услуг в классе {class_name}", services.dashboardId, { class_name: `field:${category}`, service_id: "field:col_39" });
  const preview = await (await request.post(`${api}/api/v1/workflows/${workflowId}/nodes/${named("Итого")}/preview`, { data: { limit: 100 } })).json();
  const sampleRow = preview.rows.find((row: Record<string, unknown>) => row["Класс"] === sample.name);
  const values = { ...classValues, service_id: sampleRow.__source_row__ };
  await page.goto(`/projects/${projectId}/dashboard?dashboard=${services.dashboardId}&parameters=${encodeURIComponent(JSON.stringify(values))}`);
  await widgetAction(page, "Позиция услуги в классе", services.dashboardId, { class_name: `field:${category}`, service_id: "field:col_39" });
  await widgetAction(page, "Класс услуги", classes.dashboardId, { class_name: `field:${category}` });
  const finalGraph = await getGraph(), dashboards = await (await request.get(`${api}/api/v1/projects/${projectId}/dashboards`)).json();
  expect(dashboards.items).toHaveLength(6);
  const finalSchema = await (await request.get(`${api}/api/v1/workflows/${workflowId}/schema`)).json(); expect(finalSchema.valid).toBe(true);
  writeFileSync(output, JSON.stringify({ projectId, workflowId, graph: finalGraph, dashboards, sampleValues: { ...values, cost_type: oracle.screens.cost[0].cost_meta.title }, completed: true }, null, 2));
});
