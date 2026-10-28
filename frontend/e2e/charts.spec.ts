import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { observeChartLabels, expectOpaqueChartLabels } from "./chart-label-ink";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("all remaining chart types render and dashboard management preserves widget settings", async ({ page, request }, testInfo) => {
  test.setTimeout(60000);
  await observeChartLabels(page, ["4.00"]);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Chart acceptance" } })).json();
  try {
    const uploaded = await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, {
      multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } },
    })).json();
    const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Charts" } })).json();
    const sourceId = randomUUID();
    const kinds = ["line_chart", "area_chart", "pie_chart", "donut_chart", "scatter_chart", "table"];
    const ids = kinds.map(() => randomUUID());
    const saved = await request.put(`${api}/api/v1/workflows/${workflow.id}`, { data: {
      name: "Charts", expected_revision: 1,
      nodes: [{ id: sourceId, type: "excel_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: uploaded.id, sheet_name: uploaded.workbook.sheets[0].name } },
        ...kinds.map((kind, i) => ({ id: ids[i], type: kind, version: 1, position: { x: 300, y: i * 160 }, config: { title: kind, show_labels: true, value_column_id: "col_6", category_column_id: kind === "scatter_chart" ? "col_7" : ["line_chart", "area_chart"].includes(kind) ? "col_2" : "col_4" } }))],
      edges: ids.map(id => ({ id: randomUUID(), source_node_id: sourceId, source_port: "dataset", target_node_id: id, target_port: "input" })),
    } });
    expect(saved.ok()).toBeTruthy();
    const dashboard = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "All charts" } })).json();
    const persisted = await request.put(`${api}/api/v1/dashboards/${dashboard.id}`, { data: { name: "All charts", expected_revision: 1,
      widgets: ids.map((id, i) => ({ id: randomUUID(), visualization_id: id, x: (i % 2) * 6, y: Math.floor(i / 2) * 9, width: 6, height: 9 })),
    } });
    expect(persisted.ok()).toBeTruthy();
    const lineWidgetId = (await persisted.json()).widgets.find((widget: { visualization_id: string }) => widget.visualization_id === ids[0]).id;
    await page.goto(`/projects/${project.id}/dashboard`);
    const lineWidget = page.locator(`[data-widget-id="${lineWidgetId}"]`);
    const settings = page.getByRole("dialog", { name: "Edit visualization", exact: true });
    await page.getByLabel("Theme", { exact: true }).selectOption("light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    for (const kind of kinds.filter(kind => kind !== "table")) {
      const chart = page.getByRole("img", { name: kind, exact: true });
      await chart.scrollIntoViewIfNeeded();
      await expect(chart.locator("canvas")).toBeVisible();
    }
    await expect(page.getByRole("columnheader", { name: "quantity", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
    await expectOpaqueChartLabels(page, ["4.00"], "light");
    await page.screenshot({ path: testInfo.outputPath("all-chart-types-light.png"), fullPage: true });
    await page.getByLabel("Dashboard name").fill("Renamed charts");
    await lineWidget.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await settings.getByLabel("Widget title", { exact: true }).fill("Custom widget title");
    await settings.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByLabel("Theme", { exact: true }).selectOption("dark");
    await lineWidget.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await expect(settings.getByLabel("Widget title", { exact: true })).toHaveValue("Custom widget title");
    await settings.getByLabel("Show widget title", { exact: true }).uncheck();
    await settings.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("img", { name: "line_chart", exact: true }).locator("canvas")).toBeVisible();
    await expectOpaqueChartLabels(page, ["4.00"], "dark");
    await page.screenshot({ path: testInfo.outputPath("all-chart-types-dark.png"), fullPage: true });
    await page.getByRole("button", { name: "Save dashboard" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Dashboard name")).toHaveValue("Renamed charts");
    await lineWidget.getByRole("button", { name: "Edit visualization", exact: true }).click();
    await expect(settings.getByLabel("Widget title", { exact: true })).toHaveValue("Custom widget title");
    await expect(settings.getByLabel("Show widget title", { exact: true })).not.toBeChecked();
    await settings.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "New dashboard" }).click();
    await expect(page.getByLabel("Dashboard name")).toHaveValue("Sales dashboard");
    await expect(page.locator("[data-widget-id]")).toHaveCount(0);
    await page.getByLabel("Dashboard", { exact: true }).selectOption(dashboard.id);
    await expect(page.locator("[data-widget-id]")).toHaveCount(6);
    await page.getByLabel("Dashboard", { exact: true }).selectOption({ label: "Sales dashboard" });
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Delete dashboard" }).click();
    await expect(page.getByLabel("Dashboard name")).toHaveValue("Renamed charts");
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
