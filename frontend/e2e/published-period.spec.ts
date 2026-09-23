import { showAllOperations } from "./operation-catalog";
import { expect, test } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("one date binding drives independently authored chart and scalar KPI before aggregation", async ({ page, request }) => {
  test.setTimeout(120000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Monthly publication acceptance" } })).json();
  try {
    await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "monthly-sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/monthly-sales.xlsx")) } } });
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "New field workflow", exact: true }).click();
    const saved = async () => { await expect(page.getByText("Saved", { exact: true })).toBeVisible(); await expect(page.getByText("Updating fields", { exact: true })).toHaveCount(0); };
    const add = async (name: string) => { await showAllOperations(page); await page.getByTitle(`Add ${name}`, { exact: true }).click(); };
    const connect = async (port: string, label: string) => { await page.getByLabel(`Input ${port}`, { exact: true }).selectOption({ label }); await saved(); };
    await add("Excel Source"); await saved();
    await add("Group By"); await connect("input", "Excel Source / Dataset");
    await page.getByLabel("service", { exact: true }).check();
    await page.getByRole("button", { name: "Add aggregation", exact: true }).click();
    await page.getByLabel("Aggregate field 1").selectOption({ label: "amount" });
    await page.getByLabel("Aggregation 1", { exact: true }).selectOption("sum");
    await page.getByLabel("Aggregate name 1").fill("Total"); await saved();
    await add("Sum field"); await connect("table", "Group By / Dataset"); await connect("value", "Group By / Total");
    await page.getByText("Published results and filters", { exact: true }).click();
    const publish = async (name: string, label: string) => {
      await page.getByLabel("Result name", { exact: true }).fill(name);
      const selector = page.getByLabel("Result output", { exact: true });
      await selector.selectOption({ label: await selector.locator("option").filter({ hasText: label }).innerText() });
      await page.getByRole("button", { name: "Publish result", exact: true }).click(); await saved();
    };
    await publish("Sales by service", "Group By /"); await publish("Sales total", "Sum field /");
    const point = page.getByLabel("Apply at table output", { exact: true });
    await point.selectOption({ label: await point.locator("option").filter({ hasText: "Monthly /" }).innerText() });
    const field = page.getByLabel("Filter field", { exact: true });
    await field.selectOption({ label: await field.locator("option").filter({ hasText: "date ·" }).innerText() });
    await page.getByRole("button", { name: "Apply data binding", exact: true }).click(); await saved();
    await page.getByLabel("Filter meaning").selectOption("new");
    await page.getByLabel("Selection name").fill("Service");
    await point.selectOption({ label: await point.locator("option").filter({ hasText: "Group By /" }).innerText() });
    await field.selectOption({ label: await field.locator("option").filter({ hasText: /^service / }).innerText() });
    await page.getByRole("button", { name: "Apply data binding", exact: true }).click(); await saved();
    await page.locator("summary").filter({ hasText: /^Sales by service$/ }).click();
    await page.getByLabel("Navigation field Sales by service Service", { exact: true }).selectOption({ label: "service" }); await saved();
    const workflowId = new URL(page.url()).searchParams.get("workflow");
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    expect(graph.nodes).toHaveLength(3); expect(graph.result_catalog.contexts[0].points.filter((point: { role: string }) => point.role === "period")).toHaveLength(1);
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Create dashboard", exact: true }).click();
    for (const [result, title] of [["Sales by service", "Amounts"], ["Sales total", "Total amount"], ["Sales by service", "Services"]]) {
      await page.getByRole("button", { name: "Create visualization", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Independent visualization" });
      await dialog.getByLabel("Visualization name").fill(title);
      const published = dialog.getByLabel("Published result", { exact: true });
      await published.selectOption({ label: await published.locator("option").filter({ hasText: result }).innerText() });
      if (title === "Services") await dialog.getByLabel("Visualization type").selectOption("table");
      else if (result === "Sales by service") {
        await dialog.getByLabel("Chart category", { exact: true }).selectOption({ label: "service" });
        await dialog.getByLabel("Chart value", { exact: true }).selectOption({ label: "Total" });
      }
      await dialog.getByLabel("Chart title").fill(title);
      await dialog.getByRole("button", { name: "Save visualization", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await saved();
    }
    await expect(page.getByTestId("kpi-value")).toHaveText("210.00");
    await page.getByLabel("Show shared period", { exact: true }).check();
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await saved();
    for (const [start, end, total] of [["2026-01-01", "2026-01-31", "30.00"], ["2026-02-01", "2026-02-28", "70.00"]]) {
      await page.getByLabel("Start date").fill(start); await page.getByLabel("End date").fill(end);
      await page.getByRole("button", { name: "Apply period", exact: true }).click();
      await expect(page.getByTestId("kpi-value")).toHaveText(total);
      await expect(page.getByRole("img", { name: "Amounts", exact: true })).toBeVisible();
      await expect(page.getByText("Period is not connected to this visualization.")).toHaveCount(0);
    }
    await page.reload(); await expect(page.getByTestId("kpi-value")).toHaveText("70.00");
    await page.goBack(); await expect(page.getByTestId("kpi-value")).toHaveText("30.00");
    let release!: () => void, started!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const requested = new Promise<void>(resolve => { started = resolve; });
    const deliveries: Promise<void>[] = [];
    await page.route("**/api/v1/visualizations/*/result", async route => {
      if (route.request().postDataJSON()?.context?.period?.start !== "2026-03-01") return route.continue();
      const delivery = (async () => { const response = await route.fetch(); await gate; await route.fulfill({ response }); })();
      deliveries.push(delivery); started(); await delivery;
    });
    await page.getByLabel("Start date").fill("2026-03-01"); await page.getByLabel("End date").fill("2026-03-31");
    await page.getByRole("button", { name: "Apply period", exact: true }).click(); await requested;
    await page.getByLabel("Start date").fill("2026-02-01"); await page.getByLabel("End date").fill("2026-02-28");
    await page.getByRole("button", { name: "Apply period", exact: true }).click(); await expect(page.getByTestId("kpi-value")).toHaveText("70.00");
    release(); await Promise.all(deliveries); await expect(page.getByTestId("kpi-value")).toHaveText("70.00");
    await page.unroute("**/api/v1/visualizations/*/result");
    await page.getByLabel("Start date").fill("2026-01-01"); await page.getByLabel("End date").fill("2026-01-31");
    await page.getByRole("button", { name: "Apply period", exact: true }).click(); await expect(page.getByTestId("kpi-value")).toHaveText("30.00");
    const overviewName = await page.getByLabel("Dashboard name", { exact: true }).inputValue();
    await page.getByRole("button", { name: "New dashboard", exact: true }).click();
    await page.getByLabel("Dashboard name", { exact: true }).fill("Service details");
    await page.getByText("Services · Table", { exact: true }).locator("..").getByRole("button", { name: "Add widget", exact: true }).click();
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await saved();
    const widget = page.locator("[data-widget-id]");
    await widget.getByRole("button", { name: "Configure navigation", exact: true }).click();
    const navigation = page.getByRole("dialog", { name: "Configure navigation", exact: true });
    await navigation.getByLabel("Destination dashboard").selectOption({ label: overviewName });
    await expect(navigation.getByRole("combobox").nth(1).locator("option:checked")).toHaveText("Field: service");
    await navigation.getByRole("button", { name: "Apply", exact: true }).click();
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await saved();
    await widget.locator("tbody tr").first().click();
    await expect(page.getByTestId("kpi-value")).toHaveText("10.00");
    await expect(page.getByLabel("Start date", { exact: true })).toHaveValue("2026-01-01");
    if (process.env.NODEBI_KEEP_PUBLISHED_DEMO === "1") writeFileSync(resolve("../.backups/published-date-demo.json"), JSON.stringify({ projectId: project.id, workflowId, url: page.url() }));
    expect(await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json()).toEqual(graph);
  } finally { if (process.env.NODEBI_KEEP_PUBLISHED_DEMO !== "1") await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
