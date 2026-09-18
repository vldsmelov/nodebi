import { expect, test, type APIResponse } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Workflow, ParameterValues } from "../features/workflow/types";
import type { Dashboard } from "../features/dashboard/api";
import { remapIdentities } from "./copy-identities";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
type RecordFile = { projectId: string; workflowId: string; ids: Record<string, string>; originalGraph: Workflow; originalDashboards: Dashboard[]; copied: boolean; presented: boolean };
type Service = { class_name: string; service_name: string };
type Screen = { class_row: { name: string }; service: Service; cost_meta: { title: string } };
type Result = { revision: number; total_rows: number; rows: Record<string, unknown>[]; [key: string]: unknown };
const json = async <T,>(response: APIResponse): Promise<T> => { expect(response.ok(), await response.text()).toBe(true); return response.json(); };

test("compare all 164 slices of the U5 copy and restore six views after restart", async ({ page, request, baseURL }) => {
  test.skip(process.env.NODEBI_UX_COPY_PARITY !== "1", "Opt-in private retained-copy equivalence acceptance");
  test.setTimeout(3600000);
  const record: RecordFile = JSON.parse(readFileSync(resolve("../.backups/ux-project-copy.json"), "utf8"));
  expect(record.copied && record.presented).toBe(true);
  const oracle: { screens: Record<string, Screen[]> } = JSON.parse(readFileSync(resolve("../.backups/opop-expected.json"), "utf8"));
  const reverse = Object.fromEntries(Object.entries(record.ids).map(([from, to]) => [to, from]));
  const readGraph = (id: string) => request.get(`${api}/api/v1/workflows/${id}`).then(json<Workflow>);
  const readBoards = (id: string) => request.get(`${api}/api/v1/projects/${id}/dashboards`).then(json<{ items: Dashboard[] }>).then(value => value.items);
  const graph = await readGraph(record.workflowId), boards = await readBoards(record.projectId);
  expect(await readGraph(record.originalGraph.id)).toEqual(record.originalGraph);
  expect(await readBoards(record.originalGraph.project_id)).toEqual(record.originalDashboards);
  const base = record.originalGraph.nodes.find(node => node.config?.name === "Итого")!;
  const prepared = await json<{ rows: Record<string, unknown>[]; truncated: boolean }>(await request.post(`${api}/api/v1/workflows/${record.originalGraph.id}/nodes/${base.id}/preview`, { data: { limit: 200 } }));
  expect(prepared.truncated).toBe(false);
  const serviceId = (service: Service) => {
    const rows = prepared.rows.filter(row => row["Класс"] === service.class_name && row["Услуга"] === service.service_name);
    expect(rows, "Reference service must identify one source row").toHaveLength(1);
    return rows[0].__source_row__ as number;
  };
  const cases: { name: string; values: ParameterValues }[] = [{ name: "Общая сводка затрат", values: {} }];
  for (const item of oracle.screens.class) cases.push({ name: "Класс", values: { class_name: item.class_row.name } });
  for (const item of oracle.screens.service) cases.push({ name: "Услуга", values: { class_name: item.service.class_name, service_id: serviceId(item.service) } });
  for (const item of oracle.screens.cost) cases.push({ name: "Вид затрат", values: { cost_type: item.cost_meta.title } });
  for (const item of oracle.screens.cost_class) cases.push({ name: "Вид затрат в классе", values: { class_name: item.class_row.name, cost_type: item.cost_meta.title } });
  for (const item of oracle.screens.cost_service) cases.push({ name: "Вид затрат услуги", values: { class_name: item.service.class_name, service_id: serviceId(item.service), cost_type: item.cost_meta.title } });
  expect(cases).toHaveLength(164);
  const result = (id: string, parameters: ParameterValues, offset = 0) => request.post(`${api}/api/v1/visualizations/${id}/result`, { data: { parameters, offset, limit: 1000 } }).then(json<Result>);
  const withoutRevision = (value: Result) => { const copy: Partial<Result> = { ...value }; delete copy.revision; return copy; };
  const checkpointPath = resolve("../.backups/ux-copy-parity-checkpoint.json");
  const fingerprint = JSON.stringify({ original: record.originalGraph, originalBoards: record.originalDashboards, graph, boards, cases });
  type Sample = { id: string; values: ParameterValues; result: Result };
  const checkpoint: { fingerprint: string; completed: number; comparisons: number; samples: Sample[]; sampled: string[] } = process.env.NODEBI_UX_RESUME_PARITY === "1" && existsSync(checkpointPath)
    ? JSON.parse(readFileSync(checkpointPath, "utf8")) : { fingerprint, completed: 0, comparisons: 0, samples: [], sampled: [] };
  expect(checkpoint.fingerprint, "Resume requires unchanged original/copy snapshots and case definitions").toBe(fingerprint);
  let comparisons = checkpoint.comparisons;
  const sampleResults = checkpoint.samples;
  const sampled = new Set(checkpoint.sampled);
  for (const [index, slice] of cases.entries()) {
    if (index < checkpoint.completed) continue;
    const board = record.originalDashboards.find(board => board.name === slice.name)!;
    expect(board, slice.name).toBeTruthy();
    const parameters = Object.fromEntries((board.configuration?.bindings ?? []).map(binding => [binding.workflow_parameter, slice.values[binding.dashboard_parameter]]));
    const sample = !sampled.has(board.id);
    const pages: { id: string; offset: number; expected: Result }[] = [];
    // Read each graph's sibling branches together to avoid alternately evicting both graphs.
    for (const widget of board.widgets) {
      let offset = 0;
      do {
        const expected = await result(widget.visualization_id, parameters, offset);
        pages.push({ id: widget.visualization_id, offset, expected });
        offset += expected.rows.length;
        if (offset >= expected.total_rows) break;
        expect(expected.rows.length, "Pagination must advance").toBeGreaterThan(0);
      } while (true);
    }
    for (const { id, offset, expected } of pages) {
      const actual = await result(record.ids[id], parameters, offset);
      expect(withoutRevision(remapIdentities(actual, reverse)), `${slice.name}/${id}/${offset}`).toEqual(withoutRevision(expected));
      if (sample) sampleResults.push({ id: record.ids[id], values: parameters, result: actual });
      comparisons++;
    }
    sampled.add(board.id);
    writeFileSync(checkpointPath, JSON.stringify({ fingerprint, completed: index + 1, comparisons, samples: sampleResults, sampled: [...sampled] }));
    if ((index + 1) % 10 === 0 || index === cases.length - 1) console.log(`Compared ${index + 1}/${cases.length} slices (${comparisons} widget pages)`);
  }
  writeFileSync(resolve("../.backups/ux-copy-parity-before-restart.json"), JSON.stringify({ slices: cases.length, comparisons, graph, boards, sampleResults }, null, 2));
  if (process.env.NODEBI_UX_COPY_RESTART === "1") {
    execFileSync("docker", ["compose", "restart", "backend", "postgres", "frontend"], { cwd: resolve(".."), timeout: 45000, windowsHide: true });
    await expect.poll(async () => { try { return (await request.get(`${api}/ready`)).ok() && (await request.get(baseURL!)).ok(); } catch { return false; } }, { timeout: 60000 }).toBe(true);
  }
  expect(await readGraph(record.workflowId)).toEqual(graph);
  expect(await readBoards(record.projectId)).toEqual(boards);
  for (const sample of sampleResults) expect(await result(sample.id, sample.values, sample.result.offset as number)).toEqual(sample.result);
  const loaded = async (board: Dashboard) => {
    await expect(page.locator("[data-widget-id]")).toHaveCount(board.widgets.length);
    const kinds = board.widgets.map(widget => graph.nodes.find(node => node.id === widget.visualization_id)!.type);
    await expect(page.locator('[data-testid="kpi-value"]')).toHaveCount(kinds.filter(kind => kind === "kpi").length);
    await expect(page.getByRole("table")).toHaveCount(kinds.filter(kind => kind === "table").length);
    await expect(page.getByText(/Loading visualization|Загрузка визуализации|Визуальләштерү йөкләнә/)).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  };
  for (const board of boards) {
    const values = cases.find(slice => slice.name === board.name)!.values;
    await page.goto(`/projects/${record.projectId}/dashboard?dashboard=${board.id}&mode=view&parameters=${encodeURIComponent(JSON.stringify(values))}`);
    await loaded(board); await page.reload(); await loaded(board);
    await expect(page.getByRole("heading", { name: board.name, exact: true })).toBeVisible();
    expect(JSON.parse(new URL(page.url()).searchParams.get("parameters")!)).toEqual(values);
  }
  const detail = boards.find(board => board.name === "Вид затрат услуги")!;
  const values = cases.find(slice => slice.name === detail.name)!.values;
  await page.goto(`/projects/${record.projectId}/dashboard?dashboard=${detail.id}&mode=view&parameters=${encodeURIComponent(JSON.stringify(values))}`);
  let languageLabel = "Language", themeLabel = "Theme";
  for (const [locale, nextLanguageLabel, nextThemeLabel] of [["ru", "Язык", "Тема"], ["tt", "Тел", "Тема"], ["en", "Language", "Theme"]]) {
    await page.getByLabel(languageLabel, { exact: true }).selectOption(locale); languageLabel = nextLanguageLabel; themeLabel = nextThemeLabel;
    for (const theme of ["light", "dark"]) {
      await page.getByLabel(themeLabel, { exact: true }).selectOption(theme); await loaded(detail);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await page.screenshot({ path: resolve(`../.backups/ux-copy-${locale}-${theme}.png`), fullPage: true });
    }
  }
  // A real copied table transition must stay inside the copied project and retain view mode.
  const overview = boards.find(board => board.name === "Общая сводка затрат")!;
  await page.goto(`/projects/${record.projectId}/dashboard?dashboard=${overview.id}&mode=view`); await loaded(overview);
  const widget = overview.widgets.find(widget => widget.config?.action && graph.nodes.find(node => node.id === widget.visualization_id)?.type === "table")!;
  await page.locator(`[data-widget-id="${widget.id}"]`).getByRole("table").locator("tbody tr").first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get("dashboard")).toBe(widget.config!.action!.dashboard_id);
  expect(new URL(page.url()).searchParams.get("mode")).toBe("view");
  expect(new URL(page.url()).pathname).toContain(record.projectId);
  expect(await readGraph(record.originalGraph.id)).toEqual(record.originalGraph);
  expect(await readBoards(record.originalGraph.project_id)).toEqual(record.originalDashboards);
  writeFileSync(resolve("../.backups/ux-copy-parity-report.json"), JSON.stringify({ slices: cases.length, comparisons, restarted: process.env.NODEBI_UX_COPY_RESTART === "1", originalUnchanged: true, sixViews: true, languages: ["ru", "en", "tt"], themes: ["light", "dark"], projectId: record.projectId, workflowId: record.workflowId }, null, 2));
});
