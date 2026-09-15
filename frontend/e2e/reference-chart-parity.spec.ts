import { expect, test } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConstructorAuthor } from "./constructor-author";
import { widgetAction } from "./dashboard-author";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
const enabled = process.env.NODEBI_REFERENCE_CHART_PARITY === "1";
test.use({ actionTimeout: 20000 });

test("match original chart kinds and orientations without changing datasets", async ({ page, request }) => {
  test.skip(!enabled, "Opt-in reference chart correction"); test.setTimeout(300000);
  const finalPath = resolve("../.backups/reference-finalized-project.json"), final = JSON.parse(readFileSync(finalPath, "utf8"));
  const { projectId, workflowId, sampleValues } = final;
  const author = new ConstructorAuthor(page);
  const cases = [
    ["overview", "Распределение по классам", "vertical"],
    ["cost", "Распределение вида по классам", "horizontal"],
    ["cost-class", "Структура статей вида в классе", "horizontal"],
    ["cost-service", "Состав вида затрат услуги", "horizontal"],
  ];
  await page.setViewportSize({ width: 1600, height: 2200 });
  for (const [stage, title, orientation] of cases) {
    const path = resolve(`../.backups/reference-${stage}-project.json`), project = JSON.parse(readFileSync(path, "utf8"));
    const old = project.widgets.find((item: { title: string }) => item.title === title);
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    const node = graph.nodes.find((node: { id: string }) => node.id === old.id);
    if (node.type === "bar_chart") continue;
    expect(node.type).toBe("donut_chart");
    expect(graph.edges.some((edge: { source_node_id: string }) => edge.source_node_id === old.id)).toBe(false);
    const input = graph.edges.find((edge: { target_node_id: string }) => edge.target_node_id === old.id).source_node_id;
    const oldResult = await (await request.post(`${api}/api/v1/visualizations/${old.id}/result`, { data: { parameters: sampleValues } })).json();
    const dashboardId = project.dashboardId ?? project.dashboards.items[0].id;
    const dashboard = await (await request.get(`${api}/api/v1/dashboards/${dashboardId}`)).json();
    const oldWidget = dashboard.widgets.find((widget: { visualization_id: string }) => widget.visualization_id === old.id);
    await page.goto(`/projects/${projectId}/workflow`);
    await expect(page.locator(".react-flow__node")).toHaveCount(graph.nodes.length);
    const replacement = await author.chart("Bar Chart", input, title, node.config.value_column_id, node.config.category_column_id, node.config.number_format ?? "number", node.config.decimals ?? 2);
    await page.getByLabel("Orientation", { exact: true }).selectOption(orientation); await author.saved();
    const response = await request.post(`${api}/api/v1/visualizations/${replacement}/result`, { data: { parameters: sampleValues } });
    expect(response.ok(), await response.text()).toBeTruthy(); const result = await response.json();
    expect(result.type).toBe("bar_chart"); expect(result.orientation).toBe(orientation);
    expect(result.rows).toEqual(oldResult.rows); expect(result.columns).toEqual(oldResult.columns);
    const values = Object.fromEntries(dashboard.configuration.parameters.map((parameter: { name: string }) => [parameter.name, sampleValues[parameter.name]]));
    await page.goto(`/projects/${projectId}/dashboard?dashboard=${dashboardId}&parameters=${encodeURIComponent(JSON.stringify(values))}`);
    await page.getByLabel("Add visualization", { exact: true }).selectOption(replacement);
    await page.getByRole("button", { name: "Add widget", exact: true }).click();
    await page.locator(`[data-widget-id="${oldWidget.id}"]`).getByLabel("Remove widget", { exact: true }).click();
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await author.saved();
    if (oldWidget.config.action) {
      const action = oldWidget.config.action;
      const mapping = Object.fromEntries(Object.entries(action.values as Record<string, { source: string; name: string }>).map(([name, value]) => {
        expect(["field", "parameter"]).toContain(value.source); return [name, `${value.source}:${value.name}`];
      }));
      await widgetAction(page, title, action.dashboard_id, mapping);
    }
    await page.goto(`/projects/${projectId}/workflow`); await author.selectNode(old.id);
    await page.getByLabel("Delete selected node", { exact: true }).click(); await author.saved();
    old.id = replacement;
    writeFileSync(path, JSON.stringify(project, null, 2));
  }
  const costs = JSON.parse(readFileSync(resolve("../.backups/reference-cost-project.json"), "utf8"));
  const serviceBar = costs.widgets.find((item: { title: string }) => item.title === "Топ услуг по виду затрат");
  await page.goto(`/projects/${projectId}/workflow`); await author.selectNode(serviceBar.id);
  await page.getByLabel("Orientation", { exact: true }).selectOption("vertical"); await author.saved();
  const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
  const dashboards = await (await request.get(`${api}/api/v1/projects/${projectId}/dashboards`)).json();
  expect(graph.nodes).toHaveLength(final.graph.nodes.length);
  expect(dashboards.items).toHaveLength(6);
  writeFileSync(finalPath, JSON.stringify({ ...final, graph, dashboards, chartParity: true }, null, 2));
});
