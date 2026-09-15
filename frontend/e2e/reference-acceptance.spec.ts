import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
const enabled = process.env.NODEBI_REFERENCE_ACCEPTANCE === "1";
test.use({ actionTimeout: 20000 });

test("restore all six constructor dashboards and results after restart in three languages and two themes", async ({ page, request, baseURL }) => {
  test.skip(!enabled, "Opt-in final private-project acceptance"); test.setTimeout(300000);
  const path = resolve("../.backups/reference-finalized-project.json"), project = JSON.parse(readFileSync(path, "utf8"));
  const { projectId, workflowId, sampleValues } = project;
  expect(project.chartParity).toBe(true);
  const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
  const dashboards = await (await request.get(`${api}/api/v1/projects/${projectId}/dashboards`)).json();
  expect(dashboards.items).toHaveLength(6);
  const schema = await (await request.get(`${api}/api/v1/workflows/${workflowId}/schema`)).json(); expect(schema.valid).toBe(true);
  const viewValues = (dashboard: typeof dashboards.items[0]) => Object.fromEntries(dashboard.configuration.parameters.map((parameter: { name: string }) => [parameter.name, sampleValues[parameter.name]]));
  const url = (dashboard: typeof dashboards.items[0]) => `/projects/${projectId}/dashboard?dashboard=${dashboard.id}&parameters=${encodeURIComponent(JSON.stringify(viewValues(dashboard)))}`;
  const results = async () => {
    const items: Record<string, unknown> = {};
    for (const dashboard of dashboards.items) {
      const supplied = viewValues(dashboard);
      const parameters = Object.fromEntries(dashboard.configuration.bindings.map((binding: { workflow_parameter: string; dashboard_parameter: string }) => [binding.workflow_parameter, supplied[binding.dashboard_parameter]]));
      for (const widget of dashboard.widgets) {
        const response = await request.post(`${api}/api/v1/visualizations/${widget.visualization_id}/result`, { data: { parameters } });
        expect(response.ok(), await response.text()).toBeTruthy(); items[`${dashboard.id}/${widget.id}`] = await response.json();
      }
    }
    return items;
  };
  const expected = await results();
  writeFileSync(resolve("../.backups/reference-before-restart.json"), JSON.stringify({ graph, dashboards, results: expected }, null, 2));
  if (process.env.NODEBI_REFERENCE_RESTART === "1") {
    execFileSync("docker", ["compose", "restart", "backend", "postgres", "frontend"], { cwd: resolve(".."), timeout: 45000, windowsHide: true });
    await expect.poll(async () => { try { return (await request.get(`${api}/ready`)).ok() && (await request.get(baseURL!)).ok(); } catch { return false; } }, { timeout: 60000 }).toBeTruthy();
  }
  expect(await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json()).toEqual(graph);
  expect(await (await request.get(`${api}/api/v1/projects/${projectId}/dashboards`)).json()).toEqual(dashboards);
  expect(await results()).toEqual(expected);
  const loaded = async (dashboard: typeof dashboards.items[0]) => {
    await expect(page.locator("[data-widget-id]")).toHaveCount(dashboard.widgets.length);
    const kinds = dashboard.widgets.map((widget: { visualization_id: string }) => graph.nodes.find((node: { id: string }) => node.id === widget.visualization_id).type);
    await expect(page.locator('[data-testid="kpi-value"]')).toHaveCount(kinds.filter((kind: string) => kind === "kpi").length);
    await expect(page.getByRole("table")).toHaveCount(kinds.filter((kind: string) => kind === "table").length);
    await expect(page.getByText(/Loading visualization|Загрузка визуализации|Визуальләштерү йөкләнә/)).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  };
  for (const dashboard of dashboards.items) {
    await page.goto(url(dashboard)); await loaded(dashboard);
    await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue(dashboard.name);
    await page.reload(); await loaded(dashboard);
    expect(JSON.parse(new URL(page.url()).searchParams.get("parameters")!)).toEqual(viewValues(dashboard));
  }
  const detail = dashboards.items.find((dashboard: { name: string }) => dashboard.name === "Вид затрат услуги");
  await page.goto(url(detail)); await loaded(detail);
  let languageLabel = "Language", themeLabel = "Theme";
  for (const [locale, nextLanguageLabel, nextThemeLabel] of [["ru", "Язык", "Тема"], ["tt", "Тел", "Тема"], ["en", "Language", "Theme"]]) {
    await page.getByLabel(languageLabel, { exact: true }).selectOption(locale);
    languageLabel = nextLanguageLabel; themeLabel = nextThemeLabel;
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    for (const theme of ["light", "dark"]) {
      await page.getByLabel(themeLabel, { exact: true }).selectOption(theme);
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme); await loaded(detail);
      await page.screenshot({ path: resolve(`../.backups/reference-final-${locale}-${theme}.png`), fullPage: true });
    }
  }
  const revision = graph.revision;
  expect((await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json()).revision).toBe(revision);
  expect(await (await request.get(`${api}/api/v1/projects/${projectId}/dashboards`)).json()).toEqual(dashboards);
  writeFileSync(path, JSON.stringify({ ...project, graph, dashboards, acceptance: { sixScreens: true, resultsPreserved: true, restarted: process.env.NODEBI_REFERENCE_RESTART === "1", languages: ["ru", "en", "tt"], themes: ["light", "dark"] } }, null, 2));
});
