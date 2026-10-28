import { expect, test, type Locator } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConstructorAuthor } from "./constructor-author";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
test("business guide: three workbooks to six editable sales widgets", async ({ page, request }) => {
  test.setTimeout(900000);
  page.setDefaultTimeout(15000);
  const keep = process.env.NODEBI_KEEP_BUSINESS_DEMO === "1";
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Вектор — продажи и валовая прибыль" } })).json();
  const author = new ConstructorAuthor(page);
  const save = async () => { await author.saved(); await expect(page.getByText("Updating fields", { exact: true })).toHaveCount(0); };
  const select = async (control: Locator, name: string) => { await expect(control.locator("option").filter({ hasText: name }).first()).toBeAttached(); await control.selectOption({ label: name }); };
  const calc = async (upstream: string, name: string, formula: string) => author.add("Calculated Column", upstream, async () => {
    await page.getByLabel("Output field name", { exact: true }).fill(name);
    const input = page.getByLabel("Expression", { exact: true });
    await input.fill("");
    // Insert fields using their visible names. The operator never needs column IDs.
    for (const part of formula.split(/(\{[^}]+\})/)) {
      if (part.startsWith("{")) {
        const label = part.slice(1, -1);
        const field = page.getByLabel("Insert formula field", { exact: true });
        await expect(field.locator("option").filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} ·`) })).toHaveCount(1);
        const text = await field.locator("option").filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} ·`) }).innerText();
        await field.selectOption({ label: text });
      } else if (part) { await input.focus(); await input.press("End"); await input.pressSequentially(part, { delay: 0 }); }
    }
  });
  const group = async (upstream: string, dimensions: string[], fields: string[]) => author.add("Group By", upstream, async () => {
    for (const name of dimensions) await page.getByRole("checkbox", { name, exact: true }).check();
    for (const [i, name] of fields.entries()) {
      await page.getByRole("button", { name: "Add aggregation", exact: true }).click();
      await select(page.getByLabel(`Aggregate field ${i + 1}`, { exact: true }), name);
      await page.getByLabel(`Aggregation ${i + 1}`, { exact: true }).selectOption("sum");
      await page.getByLabel(`Aggregate name ${i + 1}`, { exact: true }).fill(name);
    }
  });
  const join = async (left: string, right: string, keys: string[]) => {
    await author.selectNode(left);
    await page.getByRole("button", { name: "Join with…", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Right table", { exact: true }).selectOption(JSON.stringify([right, "dataset"]));
    await dialog.getByLabel("Join type", { exact: true }).selectOption("left");
    await dialog.getByLabel("Expected relationship", { exact: true }).selectOption("many_to_one");
    for (const [i, name] of keys.entries()) {
      if (i) await dialog.getByRole("button", { name: "Add key pair", exact: true }).click();
      await select(dialog.getByLabel(i ? `Left key ${i + 1}` : "Left key", { exact: true }), name);
      await select(dialog.getByLabel(i ? `Right key ${i + 1}` : "Right key", { exact: true }), name);
    }
    await dialog.getByRole("button", { name: "Add step", exact: true }).click(); await save();
    return (await page.locator(".react-flow__node-fieldNode.selected").getAttribute("data-id"))!;
  };
  const publish = async (node: string, name: string) => {
    await author.selectNode(node);
    await page.getByRole("button", { name: "Publish this output", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Result name", { exact: true }).fill(name);
    await dialog.getByRole("button", { name: "Publish result", exact: true }).click(); await save();
  };
  let success = false;
  try {
    for (const name of ["sales", "costs", "plan"]) {
      const response = await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: `business-${name}.xlsx`, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve(`../fixtures/excel/business-${name}.xlsx`)) } } });
      expect(response.ok()).toBeTruthy();
    }
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "New field workflow", exact: true }).click();
    const sources: Record<string, string> = {};
    for (const name of ["sales", "costs", "plan"]) {
      const book = page.getByRole("region", { name: "Workbook browser" }).locator("article").filter({ hasText: `business-${name}.xlsx` });
      await book.getByRole("button", { name: new RegExp(`business-${name}.xlsx`) }).click();
      await book.getByTitle("Add sheet to graph", { exact: true }).click(); await save();
      sources[name] = (await page.locator(".react-flow__node-fieldNode.selected").getAttribute("data-id"))!;
    }
    let detail = await join(sources.sales, sources.costs, ["Товар"]);
    detail = await calc(detail, "Выручка", "{Количество} * {Цена}");
    detail = await calc(detail, "Затраты", "{Количество} * {Себестоимость единицы}");
    detail = await calc(detail, "Валовая прибыль", "{Выручка} - {Затраты}");
    const measures = ["Выручка", "Затраты", "Валовая прибыль"];
    let monthly = await group(detail, ["Месяц"], measures);
    monthly = await join(monthly, sources.plan, ["Месяц"]);
    monthly = await calc(monthly, "Отклонение", "{Выручка} - {План}");
    monthly = await calc(monthly, "Выполнение плана", "safe_divide({Выручка}, {План}, 0)");
    let total = await group(monthly, [], [...measures, "План"]);
    total = await calc(total, "Выполнение плана", "safe_divide({Выручка}, {План}, 0)");
    const regions = await group(detail, ["Регион"], measures);
    await publish(monthly, "Продажи по месяцам");
    await publish(total, "Итоги квартала");
    await publish(regions, "Продажи по регионам");
    const workflowId = new URL(page.url()).searchParams.get("workflow");
    const path = `${api}/api/v1/workflows/${workflowId}`;
    const expected = JSON.parse(readFileSync(resolve("../fixtures/excel/business-expected.json"), "utf8"));
    for (const [node, key, sort] of [[monthly, "monthly", "Месяц"], [total, "total", ""], [regions, "regions", "Регион"]]) {
      const preview = await request.post(`${path}/nodes/${node}/preview`, { data: { limit: 100 } });
      expect(preview.ok(), await preview.text()).toBeTruthy();
      const rows = (await preview.json()).rows;
      if (sort) rows.sort((a: Record<string, string>, b: Record<string, string>) => a[sort].localeCompare(b[sort]));
      const wanted = key === "total" ? [expected.total] : expected[key];
      expect(rows).toHaveLength(wanted.length);
      for (const [i, row] of wanted.entries()) for (const [field, value] of Object.entries(row)) {
        if (typeof value === "number") expect(rows[i][field], `${key}/${field}`).toBeCloseTo(value, 8);
        else expect(rows[i][field]).toBe(value);
      }
    }
    const specs = [
      { name: "Выручка квартала", publication: "Итоги квартала", type: "kpi", value: "Выручка", category: "", format: "currency" },
      { name: "Валовая прибыль квартала", publication: "Итоги квартала", type: "kpi", value: "Валовая прибыль", category: "", format: "currency" },
      { name: "Выполнение плана квартала", publication: "Итоги квартала", type: "kpi", value: "Выполнение плана", category: "", format: "percent" },
      { name: "Выручка и план по месяцам", publication: "Продажи по месяцам", type: "line_chart", value: "Выручка", category: "Месяц", format: "currency" },
      { name: "Валовая прибыль по регионам", publication: "Продажи по регионам", type: "bar_chart", value: "Валовая прибыль", category: "Регион", format: "currency" },
      { name: "Помесячный отчёт", publication: "Продажи по месяцам", type: "table", value: "", category: "", format: "number" },
    ];
    for (const spec of specs) {
      await page.getByRole("button", { name: "Fit graph", exact: true }).click();
      const card = page.locator(".react-flow__node-resultNode").filter({ has: page.locator(`input[value="${spec.publication}"]`) });
      const create = card.getByRole("button", { name: "Create visualization", exact: true });
      await create.focus(); await create.press("Enter");
      const dialog = page.getByRole("dialog", { name: "Independent visualization", exact: true });
      await dialog.getByLabel("Visualization name", { exact: true }).fill(spec.name);
      await dialog.getByLabel("Visualization type", { exact: true }).selectOption(spec.type);
      await dialog.getByLabel("Chart title", { exact: true }).fill(spec.name);
      if (spec.value) {
        await select(dialog.getByLabel("Chart value", { exact: true }), spec.value);
        if (spec.category) await select(dialog.getByLabel("Chart category", { exact: true }), spec.category);
        await dialog.getByLabel("Number format", { exact: true }).selectOption(spec.format);
        if (spec.format === "currency") await dialog.getByLabel("Currency", { exact: true }).fill("RUB");
        await dialog.getByLabel("Decimal places", { exact: true }).fill(spec.format === "percent" ? "2" : "0");
      }
      if (spec.type === "table") {
        await dialog.getByRole("group", { name: "Table columns", exact: true }).getByRole("checkbox", { name: "Месяц__right", exact: true }).uncheck();
        await dialog.getByLabel("Number format", { exact: true }).selectOption("currency");
        await dialog.getByLabel("Currency", { exact: true }).fill("RUB");
        await dialog.getByLabel("Decimal places", { exact: true }).fill("0");
        await dialog.getByLabel("Format for Выполнение плана", { exact: true }).selectOption("percent");
        await dialog.getByLabel("Decimals for Выполнение плана", { exact: true }).fill("2");
      }
      if (spec.type === "line_chart") {
        await dialog.getByRole("button", { name: "Add series", exact: true }).click();
        await select(dialog.getByLabel("Series field 2", { exact: true }), "План");
        await dialog.getByLabel("Series name 2", { exact: true }).fill("План");
      }
      await dialog.getByRole("button", { name: "Save visualization", exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Create dashboard", exact: true }).click();
    await page.getByLabel("Dashboard name", { exact: true }).fill("Продажи и валовая прибыль · I квартал 2026");
    for (const spec of specs) {
      await page.getByRole("button", { name: "Add chart", exact: true }).click();
      await page.getByText(new RegExp(`^${spec.name}`)).first().locator("..").getByRole("button", { name: "Add widget", exact: true }).click();
    }
    await page.getByRole("button", { name: "Layout templates", exact: true }).click();
    const applyLayout = page.getByRole("button", { name: "Apply layout template", exact: true });
    if (await applyLayout.isEnabled()) await applyLayout.click();
    else await page.getByRole("dialog", { name: "Layout templates", exact: true }).getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await save();
    await page.reload(); await expect(page.locator("[data-widget-id]")).toHaveCount(6);
    await expect(page.locator("[data-widget-id] h3")).toHaveCount(6);
    await page.getByRole("button", { name: "View dashboard", exact: true }).click();
    await expect(page.locator("[data-widget-id] table")).toContainText("2026-03");
    await page.context().addCookies([{ name: "nodebi-language", value: "ru", domain: "localhost", path: "/" }]);
    await page.reload(); await expect(page.locator("[data-widget-id]")).toHaveCount(6);
    await expect(page.getByText("Загрузка визуализации...", { exact: true })).toHaveCount(0);
    await expect(page.locator("[data-widget-id] table")).toContainText("2026-03");
    await expect(page.locator("[data-widget-id]").filter({ hasText: "Выполнение плана квартала" })).toContainText(/95[,.]24/);
    await expect(page.locator("[data-widget-id] canvas")).toHaveCount(2);
    await page.waitForTimeout(1100); // Capture completed ECharts geometry, not a partial entrance frame.
    await page.screenshot({ path: test.info().outputPath("business-sales.png"), fullPage: true });
    const evidence = { projectId: project.id, workflowId, url: page.url(), expected };
    writeFileSync(test.info().outputPath("acceptance.json"), JSON.stringify(evidence, null, 2));
    if (keep) writeFileSync(resolve("../.backups/business-sales-demo.json"), JSON.stringify(evidence, null, 2));
    success = true;
  } finally { if (!keep || !success) await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
