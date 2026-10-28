import { expect, test, type Locator } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConstructorAuthor } from "./constructor-author";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
test("four books to editable P&L, shared series and a simple dashboard", async ({ page, request }) => {
  test.setTimeout(900000);
  page.setDefaultTimeout(15000);
  const started = Date.now();
  const keep = process.env.NODEBI_KEEP_ALMA_DEMO === "1";
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "AlMaBi - synthetic P&L constructor" } })).json();
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
  const window = async (upstream: string, name: string, field: string, operation: string) => author.add("Window · v2", upstream, async () => {
    await page.getByLabel("Output field name", { exact: true }).fill(name);
    await page.getByRole("combobox", { name: "Operation", exact: true }).selectOption(operation);
    await select(page.getByLabel("Value field", { exact: true }), field);
    for (const name of ["Year", "Bucket"]) await page.getByRole("group", { name: "Partition fields", exact: true }).getByLabel(name, { exact: true }).check();
    await page.getByRole("button", { name: "Add sort field", exact: true }).click();
    await select(page.getByLabel("Sort field 1", { exact: true }), "Period");
  });
  const publish = async (node: string, name: string) => {
    await author.selectNode(node);
    await page.getByRole("button", { name: "Publish this output", exact: true }).click();
    await page.getByRole("dialog").getByLabel("Result name", { exact: true }).fill(name);
    await page.getByRole("dialog").getByRole("button", { name: "Publish result", exact: true }).click(); await save();
  };
  try {
    for (const name of ["accounting", "realization", "cost", "plan"]) {
      const response = await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: `alma-${name}.xlsx`, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve(`../fixtures/excel/alma-${name}.xlsx`)) } } });
      expect(response.ok()).toBeTruthy();
    }
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "New field workflow", exact: true }).click();
    const sources: Record<string, string> = {};
    for (const name of ["accounting", "realization", "cost", "plan"]) {
      const book = page.getByRole("region", { name: "Workbook browser" }).locator("article").filter({ hasText: `alma-${name}.xlsx` });
      await book.getByRole("button", { name: new RegExp(`alma-${name}.xlsx`) }).click();
      await book.getByTitle("Add sheet to graph", { exact: true }).click(); await save();
      sources[name] = (await page.locator(".react-flow__node-fieldNode.selected").getAttribute("data-id"))!;
      if (name === "accounting") {
        await page.getByLabel("First header row", { exact: true }).fill("3");
        await page.getByLabel("Skip rows after headers", { exact: true }).fill("1");
        await page.getByLabel("Exclude final rows", { exact: true }).fill("1"); await save();
      }
    }
    let current = await join(sources.accounting, sources.realization, ["Document", "Item"]);
    current = await join(current, sources.cost, ["Document", "Item"]);
    const detail = current;
    current = await calc(current, "Year", "year({Date})");
    const measures: [string, string][] = [
      ["Revenue BU", 'if_else({Account} == "90.01", {BU}, 0)'],
      ["Revenue NU", 'if_else({Account} == "90.01", {NU}, 0)'],
      ["Expense cost", "-coalesce({Cost}, 0)"],
      ["Commercial", 'if_else({Account} == "44", {BU}, 0)'],
      ["Management", 'if_else({Account} == "26", {BU}, 0)'],
      ["Other income", 'if_else({Account} == "91.01", {BU}, 0)'],
      ["Other expense", 'if_else({Account} == "91.02", {BU}, 0)'],
    ];
    for (const [name, expression] of measures) current = await calc(current, name, expression);
    current = await group(current, ["Period", "Year", "Bucket"], measures.map(([name]) => name));
    current = await calc(current, "Operating", "{Revenue BU} + {Expense cost} + {Commercial} + {Management}");
    current = await calc(current, "PBT", "{Operating} + {Other income} + {Other expense}");
    current = await window(current, "Cumulative PBT", "PBT", "cumulative_sum");
    current = await calc(current, "Positive cumulative", "maximum({Cumulative PBT}, 0)");
    current = await window(current, "Taxed peak", "Positive cumulative", "cumulative_max");
    current = await window(current, "Previous peak", "Taxed peak", "previous");
    current = await calc(current, "Tax base", "maximum({Cumulative PBT} - coalesce({Previous peak}, 0), 0)");
    current = await calc(current, "Tax rate", 'if_else({Bucket} == "standard", 0.25, 0.02)');
    current = await calc(current, "Tax", "-{Tax base} * {Tax rate}");
    current = await calc(current, "Net profit", "{PBT} + {Tax}");
    const fields = [...measures.map(([name]) => name), "Operating", "PBT", "Tax", "Net profit"];
    current = await group(current, ["Period"], fields);
    const monthly = await join(current, sources.plan, ["Period"]);
    const total = await group(monthly, [], ["Net profit"]);
    const workflowId = new URL(page.url()).searchParams.get("workflow");
    const path = `${api}/api/v1/workflows/${workflowId}`;
    const preview = await request.post(`${path}/nodes/${monthly}/preview`, { data: { limit: 100 } });
    expect(preview.ok(), await preview.text()).toBeTruthy();
    const rows = (await preview.json()).rows.sort((a: {Period: string}, b: {Period: string}) => a.Period.localeCompare(b.Period));
    const expected = JSON.parse(readFileSync(resolve("../fixtures/excel/alma-expected.json"), "utf8"));
    expect(rows).toHaveLength(expected.length);
    for (const [i, row] of expected.entries()) for (const [name, value] of Object.entries(row)) {
      const actual = rows[i][name === "Cost" ? "Expense cost" : name];
      if (typeof value === "number") expect(actual, `${row.Period}/${name}`).toBeCloseTo(value, 8); else expect(actual).toBe(value);
    }
    await publish(monthly, "Monthly P&L"); await publish(total, "Net profit total"); await publish(detail, "Source detail");
    const visualSpecs = [
      { name: "Monthly P&L table", publication: "Monthly P&L", type: "table", value: "" },
      { name: "Revenue, plan and forecast", publication: "Monthly P&L", type: "bar_chart", value: "Revenue BU" },
      { name: "Net profit trend", publication: "Monthly P&L", type: "line_chart", value: "Net profit" },
      { name: "Total net profit", publication: "Net profit total", type: "kpi", value: "Net profit" },
      { name: "Accounting detail", publication: "Source detail", type: "table", value: "" },
    ];
    for (const spec of visualSpecs) {
      const card = page.locator(".react-flow__node-resultNode").filter({ has: page.locator(`input[value="${spec.publication}"]`) });
      // Fit the graph to reach result cards outside the current viewport.
      await page.getByRole("button", { name: "Fit graph", exact: true }).click();
      await card.getByRole("button", { name: "Create visualization", exact: true }).click({ force: true });
      const dialog = page.getByRole("dialog", { name: "Independent visualization", exact: true });
      await dialog.getByLabel("Visualization name", { exact: true }).fill(spec.name);
      await dialog.getByLabel("Visualization type", { exact: true }).selectOption(spec.type);
      await dialog.getByLabel("Chart title", { exact: true }).fill(spec.name);
      if (spec.value) {
        await select(dialog.getByLabel("Chart value", { exact: true }), spec.value);
        if (spec.type !== "kpi") await select(dialog.getByLabel("Chart category", { exact: true }), "Period");
      }
      if (spec.type === "bar_chart") for (const [i, field] of ["Revenue NU", "Plan", "Forecast"].entries()) {
        await dialog.getByRole("button", { name: "Add series", exact: true }).click();
        await select(dialog.getByLabel(`Series field ${i + 2}`, { exact: true }), field);
        await dialog.getByLabel(`Series name ${i + 2}`, { exact: true }).fill(field);
      }
      await dialog.getByRole("button", { name: "Save visualization", exact: true }).click(); await expect(dialog).toHaveCount(0);
    }
    const graph = await (await request.get(path)).json();
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Create dashboard", exact: true }).click();
    await page.getByLabel("Dashboard name", { exact: true }).fill("Synthetic P&L - four workbooks");
    for (const spec of visualSpecs) { await page.getByRole("button", { name: "Add chart", exact: true }).click(); await page.getByText(new RegExp(`^${spec.name}`)).first().locator("..").getByRole("button", { name: "Add widget", exact: true }).click(); }
    await page.getByRole("button", { name: "Layout templates", exact: true }).click();
    await page.getByRole("button", { name: "Apply layout template", exact: true }).click();
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await author.saved();
    await page.reload(); await expect(page.locator("[data-widget-id]")).toHaveCount(5);
    await page.getByRole("button", { name: "View dashboard", exact: true }).click();
    await expect(page.locator("[data-widget-id] table").first()).toContainText("2026-03");
    expect(await (await request.get(path)).json()).toEqual(graph);
    await expect(page.locator("[data-widget-id] canvas")).toHaveCount(2);
    await page.waitForTimeout(1100); // ECharts entrance animation runs on canvas, not CSS.
    await page.screenshot({ path: test.info().outputPath("alma-dashboard.png"), fullPage: true });
    const evidence = { projectId: project.id, workflowId, monthly, graph, rows, url: page.url(), automatedSeconds: (Date.now() - started) / 1000 };
    writeFileSync(test.info().outputPath("acceptance.json"), JSON.stringify(evidence));
    if (keep) writeFileSync(resolve("../.backups/alma-demo.json"), JSON.stringify(evidence));
  } finally { if (!keep) await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
