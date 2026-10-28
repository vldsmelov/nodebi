import { expect, test } from "@playwright/test";
import { activateByKeyboard, tabTo, typeByKeyboard } from "./keyboard-navigation";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

function workbook(headers: string[], rows: (string | number)[][]) {
  const python = process.env.NODEBI_PYTHON ?? resolve(process.platform === "win32" ? "../backend/.venv/Scripts/python.exe" : "../backend/.venv/bin/python");
  return execFileSync(python, ["-c", "import io,json,sys;from openpyxl import Workbook;h,rows=json.loads(sys.argv[1]);w=Workbook();s=w.active;s.title='Sales';s.append(h);[s.append(r) for r in rows];b=io.BytesIO();w.save(b);sys.stdout.buffer.write(b.getvalue())", JSON.stringify([headers, rows])]);
}

test("two-book update explicitly repairs a renamed field before applying the complete bundle", async ({ page, request }) => {
  test.setTimeout(90000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Report mapping acceptance" } })).json();
  try {
    const sources: { id: string; name: string }[] = [];
    for (const [name, field, amount] of [["orders", "Quantity", 2], ["prices", "Price", 10]] as const) {
      sources.push(await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: `${name}.xlsx`, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: workbook(["Product", field], [["A", amount]]) } } })).json());
    }
    const flow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Joined books" } })).json();
    const left = randomUUID(), right = randomUUID(), join = randomUUID(), pub = randomUUID();
    const graph = await request.put(`${api}/api/v1/workflows/${flow.id}`, { data: { name: flow.name, expected_revision: 1, format_version: 3,
      nodes: [...[left, right].map((id, index) => ({ id, type: "excel_source", version: 1, position: { x: 0, y: index * 250 }, config: { source_id: sources[index].id, sheet_name: "Sales" } })), { id: join, type: "join", version: 1, position: { x: 350, y: 0 }, config: { left_key: "col_1", right_key: "col_1", how: "inner" } }],
      edges: [left, right].map((id, index) => ({ id: randomUUID(), source_node_id: id, source_port: "dataset", target_node_id: join, target_port: index ? "right" : "left" })), result_catalog: { outputs: [{ id: pub, name: "Orders and prices", node_id: join, port: "dataset", kind: "dataset" }] } } });
    expect(graph.ok()).toBeTruthy();
    const visual = await (await request.post(`${api}/api/v1/projects/${project.id}/visualizations`, { data: { workflow_id: flow.id, publication_id: pub, expected_workflow_revision: 2, name: "Orders", type: "table", config: {} } })).json();
    const before = await (await request.get(`${api}/api/v1/visualizations/${visual.id}/result`)).json();
    await page.goto(`/projects/${project.id}/reports`);
    await page.getByRole("button", { name: "Update data", exact: true }).click();
    for (const [index, field, amount] of [[0, "Units", 9], [1, "Price", 7]] as const) {
      await page.getByLabel(`New workbook for ${sources[index].name}`, { exact: true }).setInputFiles({ name: "new.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: workbook(["Product", field], [["A", amount]]) });
      await expect(page.getByRole("combobox", { name: "Workbook version", exact: true }).nth(index)).not.toHaveValue("");
    }
    await page.getByRole("button", { name: "Check new data", exact: true }).click();
    await expect(page.getByLabel("Incoming field for Quantity", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply data update", exact: true })).toBeDisabled();
    expect(await (await request.get(`${api}/api/v1/visualizations/${visual.id}/result`)).json()).toEqual(before);
    await page.getByLabel("Incoming field for Quantity", { exact: true }).selectOption("col_2");
    await page.getByRole("button", { name: "Check new data", exact: true }).click();
    await expect(page.getByRole("button", { name: "Apply data update", exact: true })).toBeEnabled({ timeout: 30000 });
    await page.getByRole("button", { name: "Apply data update", exact: true }).click();
    await expect(page.getByRole("button", { name: "Prepare rollback", exact: true })).toBeVisible();
    const after = await (await request.get(`${api}/api/v1/visualizations/${visual.id}/result`)).json();
    expect(Object.values(after.rows[0])).toEqual(expect.arrayContaining([9, 7]));
    expect(after.columns.map((column: { column_id: string }) => column.column_id)).toEqual(before.columns.map((column: { column_id: string }) => column.column_id));
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});

for (const layout of ["desktop", "narrow", "large-text"]) test(`economist updates books, checks, freezes and restores a report (${layout})`, async ({ page, request, context }) => {
  test.setTimeout(150000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Report cycle acceptance" } })).json();
  let restoredId: string | undefined;
  try {
    const path = resolve("../fixtures/excel/sales.xlsx");
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(path) } } })).json();
    const flow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Prepared sales" } })).json();
    const node = randomUUID(), pub = randomUUID();
    const graph = await request.put(`${api}/api/v1/workflows/${flow.id}`, { data: { name: flow.name, expected_revision: 1, format_version: 3, nodes: [{ id: node, type: "excel_source", version: 1, position: { x: 0, y: 0 }, config: { source_id: source.id, sheet_name: "Sales" } }], edges: [], result_catalog: { outputs: [{ id: pub, name: "Sales records", node_id: node, port: "dataset", kind: "dataset" }] } } });
    expect(graph.ok()).toBeTruthy();
    const visual = await (await request.post(`${api}/api/v1/projects/${project.id}/visualizations`, { data: { workflow_id: flow.id, publication_id: pub, expected_workflow_revision: 2, name: "Sales table", type: "table", config: {} } })).json();
    const board = await (await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: "Sales dashboard" } })).json();
    expect((await request.put(`${api}/api/v1/dashboards/${board.id}`, { data: { name: board.name, expected_revision: 1, widgets: [{ id: randomUUID(), visualization_id: visual.id, x: 0, y: 0, width: 12, height: 6 }] } })).ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/dashboard?dashboard=${board.id}`);
    await page.getByLabel("Widget actions", { exact: true }).click();
    await page.getByRole("button", { name: "How calculated", exact: true }).click();
    const lineage = page.getByRole("dialog", { name: "How calculated" });
    await expect(lineage).toContainText("sales.xlsx");
    await lineage.getByRole("button", { name: "Close", exact: true }).click();
    if (layout !== "desktop") await page.setViewportSize({ width: layout === "narrow" ? 420 : 1280, height: 1000 });
    if (layout === "large-text") await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => { document.documentElement.style.fontSize = "32px"; });
    });
    await page.goto(`/projects/${project.id}/reports`);
    const verifyForm = async () => {
      const controls = page.locator("main input:visible, main select:visible, main textarea:visible, main button:visible");
      expect(await controls.count()).toBeGreaterThan(5);
      for (const control of await controls.all()) {
        await control.scrollIntoViewIfNeeded();
        const bounds = (await control.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    };
    await page.getByRole("button", { name: "Update data", exact: true }).click();
    await page.getByLabel("Update name", { exact: true }).fill("September books");
    await page.getByLabel(`New workbook for ${source.name}`, { exact: true }).setInputFiles(path);
    await expect(page.getByRole("button", { name: "Check new data", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Check new data", exact: true }).click();
    await expect(page.getByRole("button", { name: "Apply data update", exact: true })).toBeEnabled({ timeout: 30000 });
    await page.getByRole("button", { name: "Apply data update", exact: true }).click();
    await expect(page.getByRole("button", { name: "Prepare rollback", exact: true })).toBeVisible();
    await activateByKeyboard(page, page.getByRole("button", { name: "Check current report", exact: true }));
    await typeByKeyboard(page, page.getByLabel("Release name", { exact: true }), "September fixed");
    await typeByKeyboard(page, page.getByLabel("Period label", { exact: true }), "2026-09");
    await tabTo(page, page.getByRole("checkbox", { name: "Sales dashboard", exact: true }));
    await page.keyboard.press("Space");
    await typeByKeyboard(page, page.getByRole("textbox", { name: "Comment", exact: true }), "Recovery acceptance");
    await page.getByLabel("Start date", { exact: true }).fill("2026-09-01");
    await verifyForm();
    await expect(page.getByRole("button", { name: "Fix report release", exact: true })).toBeDisabled();
    await page.getByLabel("I reviewed the warnings", { exact: true }).check();
    page.once("dialog", dialog => dialog.accept());
    await page.reload();
    await expect(page.getByLabel("Release name", { exact: true })).toBeDisabled();
    expect(await (await request.get(`${api}/api/v1/projects/${project.id}/releases`)).json()).toEqual([]);
    await activateByKeyboard(page, page.getByRole("button", { name: "Restore local draft", exact: true }));
    await expect(page.getByLabel("Release name", { exact: true })).toHaveValue("September fixed");
    await expect(page.getByLabel("Release name", { exact: true })).toBeFocused();
    await expect(page.getByLabel("Start date", { exact: true })).toHaveValue("2026-09-01");
    await expect(page.getByLabel("End date", { exact: true })).toHaveValue("");
    await expect(page.getByRole("button", { name: "Fix report release", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Apply period", exact: true }).click();
    await expect(page.getByText("Select a valid start and end date.", { exact: true })).toBeVisible();
    await page.getByLabel("End date", { exact: true }).fill("2026-09-30");
    await page.getByRole("button", { name: "Apply period", exact: true }).click();
    await expect(page.getByRole("button", { name: "Apply period", exact: true })).toBeFocused();
    await verifyForm();
    await page.screenshot({ path: test.info().outputPath("release-settings.png"), fullPage: true });
    await expect(page.getByText("Date edits are not applied. Apply the period or choose All time.")).toHaveCount(0);
    await activateByKeyboard(page, page.getByRole("button", { name: "All time", exact: true }));
    await expect(page.getByLabel("Period label", { exact: true })).toHaveValue("2026-09");
    await expect(page.getByRole("textbox", { name: "Comment", exact: true })).toHaveValue("Recovery acceptance");
    await expect(page.getByRole("checkbox", { name: "Sales dashboard", exact: true })).toBeChecked();
    await expect(page.getByLabel("I reviewed the warnings", { exact: true })).not.toBeChecked();
    await expect(page.getByRole("button", { name: "Fix report release", exact: true })).toBeEnabled({ timeout: 30000 });
    await activateByKeyboard(page, page.getByRole("button", { name: "Fix report release", exact: true }));
    await expect(page.getByRole("button", { name: "Open release", exact: true })).toBeVisible({ timeout: 30000 });
    await activateByKeyboard(page, page.getByRole("button", { name: "Open release", exact: true }));
    await expect(page.getByText("Frozen release. Changes to the working project do not affect this report.")).toBeVisible();
    await expect(page.locator("table").last()).toBeVisible();
    const frozenRows = await page.locator("table").last().locator("tbody tr").allTextContents();
    expect(frozenRows).toHaveLength(5);
    // Changing the working graph must not mutate the fixed release or its restored project.
    const workingGraph = await (await request.get(`${api}/api/v1/workflows/${flow.id}`)).json();
    const changedGraph = await request.put(`${api}/api/v1/workflows/${flow.id}`, { data: {
      name: workingGraph.name, format_version: workingGraph.version, expected_revision: workingGraph.revision,
      edges: workingGraph.edges, result_catalog: workingGraph.result_catalog,
      presentation: workingGraph.presentation, parameters: workingGraph.parameters,
      nodes: workingGraph.nodes.map((item: { config: Record<string, unknown> }) => ({ ...item, config: { ...item.config, skip_data_rows: 1 } })),
    } });
    expect(changedGraph.ok(), await changedGraph.text()).toBeTruthy();
    const changedResult = await (await request.get(`${api}/api/v1/visualizations/${visual.id}/result`)).json();
    expect(changedResult.rows).toHaveLength(4);
    page.once("dialog", dialog => dialog.accept());
    await page.reload();
    await page.getByRole("button", { name: "Open release", exact: true }).click();
    await expect(page.locator("table").last()).toBeVisible();
    expect(await page.locator("table").last().locator("tbody tr").allTextContents()).toEqual(frozenRows);
    for (const [language, title] of [["ru", "Подготовка и выпуск отчёта"], ["tt", "Хисап әзерләү һәм чыгару"]]) {
      await context.addCookies([{ name: "nodebi-language", value: language, domain: "localhost", path: "/" }]);
      await page.reload();
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      for (const theme of ["light", "dark"]) {
        await context.addCookies([{ name: "nodebi-theme", value: theme, domain: "localhost", path: "/" }]);
        await page.reload();
        await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      }
    }
    await context.addCookies([{ name: "nodebi-language", value: "en", domain: "localhost", path: "/" }]);
    await page.reload();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    page.once("dialog", dialog => dialog.accept("Recovered September"));
    await page.getByRole("button", { name: "Restore as new project", exact: true }).click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/);
    restoredId = page.url().split("/").at(-1);
    expect(restoredId).not.toBe(project.id);
    await expect(page.getByRole("heading", { name: "Restored report views" })).toBeVisible();
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.getByRole("link", { name: "Sales dashboard", exact: true }).click();
    await expect(page.locator("[data-widget-id] table")).toBeVisible();
    expect(await page.locator("[data-widget-id] table tbody tr").allTextContents()).toEqual(frozenRows);
  } finally {
    if (restoredId) await request.delete(`${api}/api/v1/projects/${restoredId}?confirm=true`);
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
