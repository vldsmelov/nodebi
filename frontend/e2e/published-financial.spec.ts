import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Dashboard, Visualization } from "../features/dashboard/api";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("converted financial dashboards retain six screens and real row/KPI transitions in both themes and three languages", async ({ page, request }) => {
  test.skip(process.env.NODEBI_FIELD_FINANCIAL !== "1", "Requires the private financial project and parity report");
  test.setTimeout(180000);
  const record = JSON.parse(readFileSync(resolve("../.backups/field-financial-project.json"), "utf8"));
  const report = JSON.parse(readFileSync(resolve("../.backups/published-financial-parity.json"), "utf8"));
  expect(report.completed).toBe(164);
  const graph = await (await request.get(`${api}/api/v1/workflows/${record.workflowId}`)).json();
  expect(graph.nodes.some((node: { type: string }) => ["bar_chart", "kpi", "table", "donut_chart"].includes(node.type))).toBe(false);
  expect(graph.version).toBe(3);
  const boards: Dashboard[] = (await (await request.get(`${api}/api/v1/projects/${record.projectId}/dashboards`)).json()).items;
  const visuals: Visualization[] = (await (await request.get(`${api}/api/v1/projects/${record.projectId}/visualizations`)).json()).items;
  expect(boards).toHaveLength(6); expect(visuals).toHaveLength(53);
  const loaded = async (board: Dashboard) => {
    await expect(page.locator("[data-widget-id]")).toHaveCount(board.widgets.length);
    await expect(page.getByTestId("kpi-value")).toHaveCount(board.widgets.filter(widget => visuals.find(item => item.id === widget.visualization_id)?.type === "kpi").length);
    await expect(page.getByText(/Loading visualization|Загрузка визуализации|Визуальләштерү йөкләнә/)).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  };
  for (const board of boards) {
    const values = report.cases.find((item: { name: string }) => item.name === board.name).values;
    await page.goto(`/projects/${record.projectId}/dashboard?dashboard=${board.id}&mode=view&parameters=${encodeURIComponent(JSON.stringify(values))}`);
    await loaded(board); await page.reload(); await loaded(board);
  }
  for (const [name, kind] of [["Общая сводка затрат", "table"], ["Вид затрат", "kpi"]]) {
    const board = boards.find(board => board.name === name)!;
    const values = report.cases.find((item: { name: string }) => item.name === board.name).values;
    await page.goto(`/projects/${record.projectId}/dashboard?dashboard=${board.id}&mode=view&parameters=${encodeURIComponent(JSON.stringify(values))}`); await loaded(board);
    const widget = board.widgets.find(widget => widget.config?.action && visuals.find(item => item.id === widget.visualization_id)?.type === kind)!;
    const element = page.locator(`[data-widget-id="${widget.id}"]`);
    if (kind === "table") await element.locator("tbody tr").first().click(); else await element.getByTestId("kpi-value").click();
    await expect.poll(() => new URL(page.url()).searchParams.get("dashboard")).toBe(widget.config!.action!.dashboard_id);
    await loaded(boards.find(board => board.id === widget.config!.action!.dashboard_id)!);
  }
  let languageLabel = "Language";
  for (const [locale, language, theme] of [["ru", "Язык", "Тема"], ["tt", "Тел", "Тема"], ["en", "Language", "Theme"]]) {
    await page.getByLabel(languageLabel, { exact: true }).selectOption(locale); languageLabel = language;
    for (const value of ["light", "dark"]) {
      await page.getByLabel(theme, { exact: true }).selectOption(value);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("data-theme", value);
      await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    }
  }
  // Node/edge arrays represent a DAG; PostgreSQL does not promise SELECT order.
  const normalized = (value: typeof graph) => ({ ...value,
    nodes: [...value.nodes].sort((a: {id: string}, b: {id: string}) => a.id.localeCompare(b.id)),
    edges: [...value.edges].sort((a: {id: string}, b: {id: string}) => a.id.localeCompare(b.id)),
  });
  expect(normalized(await (await request.get(`${api}/api/v1/workflows/${record.workflowId}`)).json())).toEqual(normalized(graph));
});
