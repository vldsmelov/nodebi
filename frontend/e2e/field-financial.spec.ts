import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Workflow } from "../features/workflow/types";
import type { Dashboard } from "../features/dashboard/api";

test.use({ actionTimeout: 15000 });
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("review six retained field dashboards and edit a real field expression through the UI", async ({ page, request }) => {
  test.skip(process.env.NODEBI_FIELD_FINANCIAL !== "1", "Requires the private assembled field project and numerical parity report");
  test.setTimeout(300000);
  const record = JSON.parse(readFileSync(resolve("../.backups/field-financial-project.json"), "utf8"));
  const report = JSON.parse(readFileSync(resolve("../.backups/field-financial-parity.json"), "utf8"));
  expect(report.completed).toBe(164);
  const path = `${api}/api/v1/workflows/${record.workflowId}`;
  const graph: Workflow = await (await request.get(path)).json();
  const boards: Dashboard[] = (await (await request.get(`${api}/api/v1/projects/${record.projectId}/dashboards`)).json()).items;
  expect(boards).toHaveLength(6);
  expect(graph.nodes.filter(node => node.type === "calculated_column")).toHaveLength(0);
  expect(graph.nodes.filter(node => node.type === "bar_chart" || node.type === "kpi").every(node => node.version === 2)).toBe(true);
  const loaded = async (board: Dashboard) => {
    await expect(page.locator("[data-widget-id]")).toHaveCount(board.widgets.length);
    await expect(page.getByTestId("kpi-value")).toHaveCount(board.widgets.filter(widget => graph.nodes.find(node => node.id === widget.visualization_id)?.type === "kpi").length);
    await expect(page.getByText(/Loading visualization|Загрузка визуализации|Визуальләштерү йөкләнә/)).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  };
  for (const board of boards) {
    const values = report.cases.find((item: { name: string }) => item.name === board.name).values;
    await page.goto(`/projects/${record.projectId}/dashboard?dashboard=${board.id}&mode=view&parameters=${encodeURIComponent(JSON.stringify(values))}`);
    await loaded(board); await page.reload(); await loaded(board);
    if (board.name === "Общая сводка затрат") {
      // Wait for real painted series, not merely the chart container or initial animation frame.
      await expect(page.getByRole("img")).toHaveCount(2);
      for (const chart of await page.getByRole("img").all()) {
        await expect.poll(async () => chart.locator("canvas").evaluateAll(elements => elements.reduce((count, element) => {
          const canvas = element as HTMLCanvasElement;
          const pixels = canvas.getContext("2d")!.getImageData(Math.floor(canvas.width * 0.15), Math.floor(canvas.height * 0.1), Math.floor(canvas.width * 0.7), Math.floor(canvas.height * 0.65)).data;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] && Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) - Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 60) count++;
          }
          return count;
        }, 0))).toBeGreaterThan(2000);
      }
    }
    await page.screenshot({ path: resolve(`../.backups/field-financial-${board.id}.png`), fullPage: true });
  }
  const overview = boards.find(board => board.name === "Общая сводка затрат")!;
  await page.goto(`/projects/${record.projectId}/dashboard?dashboard=${overview.id}&mode=view`); await loaded(overview);
  const widget = overview.widgets.find(widget => widget.config?.action && graph.nodes.find(node => node.id === widget.visualization_id)?.type === "table")!;
  await page.locator(`[data-widget-id="${widget.id}"]`).getByRole("table").locator("tbody tr").first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get("dashboard")).toBe(widget.config!.action!.dashboard_id);
  expect(new URL(page.url()).pathname).toContain(record.projectId);
  const leader = boards.find(board => board.name === "Вид затрат")!;
  const leaderValues = report.cases.find((item: { name: string }) => item.name === leader.name).values;
  await page.goto(`/projects/${record.projectId}/dashboard?dashboard=${leader.id}&mode=view&parameters=${encodeURIComponent(JSON.stringify(leaderValues))}`);
  await loaded(leader);
  const leaderWidget = leader.widgets.find(widget => widget.config?.action && graph.nodes.find(node => node.id === widget.visualization_id)?.type === "kpi")!;
  await page.locator(`[data-widget-id="${leaderWidget.id}"]`).getByTestId("kpi-value").click();
  await expect.poll(() => new URL(page.url()).searchParams.get("dashboard")).toBe(leaderWidget.config!.action!.dashboard_id);
  await loaded(boards.find(board => board.id === leaderWidget.config!.action!.dashboard_id)!);
  let languageLabel = "Language", themeLabel = "Theme";
  for (const [locale, language, theme] of [["ru", "Язык", "Тема"], ["tt", "Тел", "Тема"], ["en", "Language", "Theme"]]) {
    await page.getByLabel(languageLabel, { exact: true }).selectOption(locale); languageLabel = language; themeLabel = theme;
    for (const value of ["light", "dark"]) {
      await page.getByLabel(themeLabel, { exact: true }).selectOption(value);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("data-theme", value);
      await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    }
  }
  await page.goto(`/projects/${record.projectId}/workflow?workflow=${graph.id}&mode=fields`);
  await expect(page.locator(".react-flow__node")).toHaveCount(8);
  await page.screenshot({ path: resolve("../.backups/field-financial-blocks.png") });
  const formula = graph.nodes.find(node => node.type === "field_formula" && node.ui?.label === "Итого — выражение")!;
  await page.getByLabel("Find workflow node", { exact: true }).fill(String(formula.ui?.label));
  const choice = page.getByLabel("Edit workflow node", { exact: true });
  await choice.selectOption({ label: await choice.locator("option").filter({ hasText: String(formula.ui?.label) }).first().innerText() });
  await expect(page.getByLabel("Expression", { exact: true })).toHaveValue(String(formula.config?.expression));
  const card = page.locator(`[data-id="${formula.id}"].react-flow__node`);
  await expect(card).toBeInViewport();
  await expect.poll(async () => (await card.boundingBox())?.width ?? 0).toBeGreaterThan(200);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.getByLabel("Expression", { exact: true }).fill(`(${String(formula.config?.expression)})`);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await expect.poll(async () => (await (await request.get(path)).json()).nodes.find((node: { id: string }) => node.id === formula.id).config.expression).toBe(`(${String(formula.config?.expression)})`);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Expression", { exact: true })).toHaveValue(String(formula.config?.expression));
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.screenshot({ path: resolve("../.backups/field-financial-expression.png") });
  await page.getByRole("button", { name: /^Back to workflow/ }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  const final: Workflow = await (await request.get(path)).json();
  const orderedNodes = (items: Workflow["nodes"]) => [...items].sort((a, b) => a.id.localeCompare(b.id));
  expect(orderedNodes(final.nodes)).toEqual(orderedNodes(graph.nodes));
  const ordered = (items: Workflow["edges"]) => [...items].sort((a, b) => a.id.localeCompare(b.id));
  expect(ordered(final.edges)).toEqual(ordered(graph.edges));
});
