import { expect, test } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { calculated as field } from "./constructor-author";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
const artifactPath = process.env.NODEBI_REFERENCE_SERVICE_PROJECT;
const expectedPath = process.env.NODEBI_REFERENCE_EXPECTED;
test.use({ actionTimeout: 20000 });

test("review retained service screen, finish class drill-through and verify service slices", async ({ page, request }) => {
  test.skip(!artifactPath || !expectedPath, "Opt-in review of retained private service project");
  test.setTimeout(300000);
  const project = JSON.parse(readFileSync(resolve(artifactPath!), "utf8"));
  const previous = JSON.parse(readFileSync(resolve("../.backups/reference-class-project.json"), "utf8"));
  const oracle = JSON.parse(readFileSync(resolve(expectedPath!), "utf8"));
  const { projectId, workflowId, dashboardId } = project;
  expect(project.widgets).toHaveLength(8);
  const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
  const named = (name: string) => graph.nodes.find((node: { config: { name?: string } }) => node.config.name === name).id;
  const category = field(named("Класс")), base = named("Итого");
  const allServices = await (await request.post(`${api}/api/v1/workflows/${workflowId}/nodes/${base}/preview`, { data: { limit: 100 } })).json();
  const widget = (title: string) => project.widgets.find((item: { title: string }) => item.title === title).id;
  for (const reference of oracle.screens.service) {
    const source = reference.service;
    const matches = allServices.rows.filter((row: Record<string, unknown>) => row["Класс"] === source.class_name && row["Услуга"] === source.service_name);
    expect(matches).toHaveLength(1);
    const selectedId = matches[0].__source_row__;
    const result = async (title: string) => {
      const response = await request.post(`${api}/api/v1/visualizations/${widget(title)}/result`, { data: { parameters: { class_name: source.class_name, service_id: selectedId } } });
      expect(response.ok(), await response.text()).toBeTruthy(); return response.json();
    };
    const scalar = async (title: string) => { const data = await result(title); return data.rows[0][data.value_field]; };
    expect(await scalar("Выбранная услуга")).toBe(source.service_name);
    expect(await scalar("Класс услуги")).toBe(source.class_name);
    expect(await scalar("Итого по услуге")).toBeCloseTo(source.total_cost, 5);
    expect(await scalar("Косвенные сумма")).toBeCloseTo(source.indirect_sum, 5);
    expect(await scalar("Доля услуги в классе")).toBeCloseTo(reference.class_row.totals.total ? source.total_cost / reference.class_row.totals.total : 0, 12);
    const bars = await result("Позиция услуги в классе");
    expect(bars.rows.map((row: Record<string, unknown>) => row[bars.category_field])).toEqual(reference.peer_labels);
    bars.rows.forEach((row: Record<string, number>, index: number) => expect(row[bars.value_field]).toBeCloseTo(reference.peer_totals[index], 5));
    expect(bars.rows.filter((row: Record<string, unknown>) => row[bars.highlight_field] === bars.highlight_value)).toHaveLength(1);
    const costs = await result("Виды затрат услуги");
    expect(costs.rows).toHaveLength(reference.cost_cards.length);
    costs.rows.forEach((row: Record<string, unknown>, index: number) => {
      expect(row.field_name).toBe(reference.cost_cards[index].title);
      expect(row.value).toBeCloseTo(reference.cost_cards[index].amount, 5);
      expect(row["Доля вида в услуге"]).toBeCloseTo(reference.cost_cards[index].share / 100, 12);
    });
    const articles = await result("Статьи затрат услуги");
    expect(articles.rows).toHaveLength(reference.component_rows.length);
    articles.rows.forEach((row: Record<string, unknown>, index: number) => {
      expect(row["Тип"]).toBe(reference.component_rows[index].type);
      expect(row["Статья"]).toBe(reference.component_rows[index].component);
      expect(row["Сумма статьи"]).toBeCloseTo(reference.component_rows[index].value, 5);
    });
  }
  const chosen = oracle.navigation.class_rows[0].name;
  await page.goto(`/projects/${projectId}/dashboard?dashboard=${previous.dashboardId}&parameters=${encodeURIComponent(JSON.stringify({ class_name: chosen }))}`);
  await page.getByText("Widget navigation", { exact: true }).click();
  await page.getByLabel("Configure widget navigation").selectOption({ label: "Услуги класса" });
  const navigation = page.locator("details").filter({ has: page.getByText("Widget navigation", { exact: true }) });
  await navigation.getByLabel("Destination dashboard").selectOption(dashboardId);
  await navigation.getByLabel("Navigation value for class_name").selectOption(`field:${category}`);
  await navigation.getByLabel("Navigation value for service_id").selectOption("field:col_39");
  await page.getByRole("button", { name: "Save dashboard", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.getByRole("table").locator("tbody tr").first().click();
  await expect(page.getByLabel("Dashboard name")).toHaveValue("Услуга");
  await expect(page.locator("[data-widget-id]")).toHaveCount(8);
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Dashboard name")).toHaveValue("Услуга");
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "К классу", exact: true }).click();
  await expect(page.getByLabel("Dashboard name")).toHaveValue("Класс");
  const restored = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
  for (const node of previous.graph.nodes) expect(restored.nodes.find((item: { id: string }) => item.id === node.id)).toEqual(node);
  expect(restored).toEqual(graph);
  writeFileSync(resolve(artifactPath!), JSON.stringify({ ...project, graph: restored, completed: true, review: "all 36 services and class drill-through passed" }, null, 2));
});
