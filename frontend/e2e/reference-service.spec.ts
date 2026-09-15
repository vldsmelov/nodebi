import { expect, test } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ConstructorAuthor, calculated as field, hex } from "./constructor-author";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
const artifactPath = process.env.NODEBI_REFERENCE_CLASS_PROJECT;
const expectedPath = process.env.NODEBI_REFERENCE_EXPECTED;
const output = resolve("../.backups/reference-service-project.json");
test.use({ actionTimeout: 20000 });

test("author service and article branches and verify every service against original routes", async ({ page, request }) => {
  test.skip(!artifactPath || !expectedPath, "Opt-in private reference project extension");
  test.setTimeout(600000);
  expect(existsSync(output), "Review retained progress before repeating authoring").toBe(false);
  const previous = JSON.parse(readFileSync(resolve(artifactPath!), "utf8"));
  const oracle = JSON.parse(readFileSync(resolve(expectedPath!), "utf8"));
  const { projectId, workflowId } = previous;
  const initial = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
  const named = (name: string): string => {
    const nodes = initial.nodes.filter((node: { config: { name?: string } }) => node.config.name === name);
    expect(nodes).toHaveLength(1); return nodes[0].id;
  };
  const base = named("Итого"), category = field(named("Класс")), service = field(named("Услуга"));
  const serviceShare = named("Доля в классе");
  const preparedSchema = await (await request.get(`${api}/api/v1/workflows/${workflowId}/schema`)).json();
  const columns = preparedSchema.nodes.find((node: { node_id: string }) => node.node_id === base).columns as { column_id: string; display_name: string; metadata: { header_levels?: string[] } }[];
  const sourceColumn = (index: number) => columns.find(column => column.column_id === `col_${index}`)!;
  const author = new ConstructorAuthor(page), widgets: { id: string; title: string }[] = [];
  const branches: Record<string, string> = {};
  let dashboardId = "", completed = false;
  const addChart = async (kind: string, upstream: string, title: string, value: string, category?: string, format = "number") => {
    const id = await author.chart(kind, upstream, title, value, category, format); widgets.push({ id, title }); return id;
  };
  try {
    await page.setViewportSize({ width: 1600, height: 2200 });
    await page.goto(`/projects/${projectId}/workflow`);
    await expect(page.locator(".react-flow__node")).toHaveCount(initial.nodes.length);
    // Project-specific mappings are authored as configuration, not imported by application code.
    const detailGroups = [[6, 7, 8, 10, 11, 12, 13, 14, 15, 16], [18, 19, 20, 21, 22], [23, 24, 25]];
    const costNames = ["Прямые расходы", "Косвенные расходы", "Неэффективность"];
    const converted = await author.add("Convert Types", base, async () => {
      for (const [index, column] of detailGroups.flat().entries()) {
        await page.getByRole("button", { name: "Add conversion", exact: true }).click();
        await page.getByLabel("Conversion field", { exact: true }).nth(index).selectOption(`col_${column}`);
      }
    });
    const articleBranches: string[] = [];
    let articleId = "", articleName = "", articleValue = "", articleType = "";
    for (const [index, positions] of detailGroups.entries()) {
      const names = positions.map(position => sourceColumn(position).display_name);
      const leafNames = positions.map(position => sourceColumn(position).metadata.header_levels![1].replace(/\s+/g, " ").trim());
      const chosen = await author.select(converted, ["__source_row__", "Класс", "Услуга", "Итого", ...names]);
      const renamed = await author.rename(chosen, positions.map((position, i) => [`col_${position}`, leafNames[i]]));
      const long = await author.unpivot(renamed, ["__source_row__", "Класс", "Услуга", "Итого"], leafNames);
      const filled = await author.calc(long, "Сумма статьи", `coalesce([unpivot_${hex(long)}_value], 0)`);
      const typed = await author.calc(filled, "Тип", JSON.stringify(costNames[index]));
      const selected = await author.select(typed, ["__source_row__", "Класс", "Услуга", "Итого", "field_id", "field_name", "Сумма статьи", "Тип"]);
      const normalized = await author.rename(selected, [[`unpivot_${hex(long)}_field_id`, "Идентификатор статьи"], [`unpivot_${hex(long)}_field_name`, "Статья"]]);
      articleBranches.push(normalized);
      if (index === 0) { articleId = `unpivot_${hex(long)}_field_id`; articleName = `unpivot_${hex(long)}_field_name`; articleValue = field(filled); articleType = field(typed); }
    }
    const union = await author.union(await author.union(articleBranches[0], articleBranches[1]), articleBranches[2]);
    branches.articles = union;
    branches.articleId = articleId; branches.articleName = articleName; branches.articleValue = articleValue; branches.articleType = articleType;
    const costLong = await author.unpivot(serviceShare, ["__source_row__", "Класс", "Услуга", "Итого", "Доля в классе"], costNames);
    const costShare = await author.calc(costLong, "Доля вида в услуге", `safe_divide([unpivot_${hex(costLong)}_value], [${field(base)}], 0)`);
    branches.costs = costShare; branches.costType = `unpivot_${hex(costLong)}_field_name`; branches.costValue = `unpivot_${hex(costLong)}_value`;
    const selectedClass = await author.filter(serviceShare, category, "class_name");
    const peers = await author.sort(selectedClass, [[field(base), "descending"], ["col_39", "ascending"]]);
    const selectedService = await author.filter(peers, "col_39", "service_id");
    branches.service = selectedService; branches.peers = peers;
    const serviceName = await addChart("KPI", selectedService, "Выбранная услуга", service);
    const className = await addChart("KPI", selectedService, "Класс услуги", category);
    const total = await addChart("KPI", selectedService, "Итого по услуге", field(base));
    const indirectSum = await author.calc(selectedService, "Косвенные с неэффективностью", "coalesce([col_17], 0)");
    const indirect = await addChart("KPI", indirectSum, "Косвенные сумма", field(indirectSum));
    const share = await addChart("KPI", selectedService, "Доля услуги в классе", field(serviceShare), undefined, "percent");
    const bar = await addChart("Bar Chart", peers, "Позиция услуги в классе", field(base), service);
    await page.getByText("Highlight selection", { exact: true }).click();
    await page.getByLabel("Highlight field", { exact: true }).selectOption("col_39");
    await page.getByLabel("Highlight parameter", { exact: true }).selectOption("service_id");
    await page.getByText("Navigation fields", { exact: true }).click();
    await page.locator("details").filter({ has: page.getByText("Navigation fields", { exact: true }) }).getByLabel("Класс", { exact: true }).check();
    await author.saved();
    const serviceCosts = await author.filter(await author.filter(costShare, category, "class_name"), "col_39", "service_id");
    const costTable = await author.table(serviceCosts, "Виды затрат услуги", ["field_name", "value", "Доля вида в услуге"]);
    widgets.push({ id: costTable, title: "Виды затрат услуги" });
    await page.getByLabel("Format for Доля вида в услуге", { exact: true }).selectOption("percent");
    await author.saved();
    const serviceArticles = await author.filter(await author.filter(union, category, "class_name"), "col_39", "service_id");
    const nonzero = await author.add("Filter", serviceArticles, async () => {
      await page.getByRole("button", { name: "Add condition", exact: true }).click();
      await page.getByLabel("Filter column 1", { exact: true }).selectOption(articleValue);
      await page.getByLabel("Filter operator 1", { exact: true }).selectOption("not_equals");
      await page.getByLabel("Filter value 1", { exact: true }).fill("0");
    });
    const ordered = await author.sort(nonzero, [[articleValue, "descending"]]);
    const top = await author.add("Limit", ordered, async () => { await page.getByLabel("Maximum rows", { exact: true }).fill("25"); });
    const articleTable = await author.table(top, "Статьи затрат услуги", ["Тип", "Статья", "Сумма статьи"]);
    widgets.push({ id: articleTable, title: "Статьи затрат услуги" });
    const allServicesResponse = await request.post(`${api}/api/v1/workflows/${workflowId}/nodes/${base}/preview`, { data: { limit: 100 } });
    expect(allServicesResponse.ok()).toBeTruthy();
    const allServices = await allServicesResponse.json();
    const rowId = (reference: { class_name: string; service_name: string }) => {
      const matches = allServices.rows.filter((row: Record<string, unknown>) => row["Класс"] === reference.class_name && row["Услуга"] === reference.service_name);
      expect(matches).toHaveLength(1); return matches[0].__source_row__ as number;
    };
    for (const reference of oracle.screens.service) {
      const source = reference.service, selectedId = rowId(source);
      const result = async (id: string) => {
        const response = await request.post(`${api}/api/v1/visualizations/${id}/result`, { data: { parameters: { class_name: source.class_name, service_id: selectedId } } });
        expect(response.ok(), await response.text()).toBeTruthy(); return response.json();
      };
      const scalar = async (id: string) => { const data = await result(id); return data.rows[0][data.value_field]; };
      expect(await scalar(serviceName)).toBe(source.service_name); expect(await scalar(className)).toBe(source.class_name);
      expect(await scalar(total)).toBeCloseTo(source.total_cost, 5); expect(await scalar(indirect)).toBeCloseTo(source.indirect_sum, 5);
      expect(await scalar(share)).toBeCloseTo(reference.class_row.totals.total ? source.total_cost / reference.class_row.totals.total : 0, 12);
      const bars = await result(bar);
      expect(bars.rows.map((row: Record<string, unknown>) => row[bars.category_field])).toEqual(reference.peer_labels);
      bars.rows.forEach((row: Record<string, number>, index: number) => expect(row[bars.value_field]).toBeCloseTo(reference.peer_totals[index], 5));
      expect(bars.rows.filter((row: Record<string, unknown>) => row[bars.highlight_field] === bars.highlight_value)).toHaveLength(1);
      const costs = await result(costTable);
      expect(costs.rows).toHaveLength(reference.cost_cards.length);
      costs.rows.forEach((row: Record<string, unknown>, index: number) => {
        expect(row.field_name).toBe(reference.cost_cards[index].title);
        expect(row.value).toBeCloseTo(reference.cost_cards[index].amount, 5);
        expect(row["Доля вида в услуге"]).toBeCloseTo(reference.cost_cards[index].share / 100, 12);
      });
      const articles = await result(articleTable);
      expect(articles.rows).toHaveLength(reference.component_rows.length);
      articles.rows.forEach((row: Record<string, unknown>, index: number) => {
        expect(row["Тип"]).toBe(reference.component_rows[index].type);
        expect(row["Статья"]).toBe(reference.component_rows[index].component);
        expect(row["Сумма статьи"]).toBeCloseTo(reference.component_rows[index].value, 5);
      });
    }
    await page.goto(`/projects/${projectId}/dashboard?dashboard=${previous.dashboardId}`);
    await page.getByRole("button", { name: "New dashboard", exact: true }).click();
    await expect(page.getByLabel("Dashboard name")).toHaveValue("Sales dashboard");
    dashboardId = new URL(page.url()).searchParams.get("dashboard")!;
    await page.getByLabel("Dashboard name").fill("Услуга");
    for (const widget of widgets) {
      await page.getByLabel("Add visualization", { exact: true }).selectOption(widget.id);
      await page.getByRole("button", { name: "Add widget", exact: true }).click();
    }
    await page.getByText("Dashboard settings", { exact: true }).click();
    for (const [index, [name, type, label, column]] of [["class_name", "string", "Класс", category], ["service_id", "integer", "Номер исходной строки услуги", "col_39"]].entries()) {
      await page.getByRole("button", { name: "Add dashboard parameter", exact: true }).click();
      await page.getByLabel(`Dashboard parameter name ${index + 1}`).fill(name);
      await page.getByLabel(`Dashboard parameter type ${index + 1}`).selectOption(type);
      await page.getByLabel(`Dashboard parameter label ${index + 1}`).fill(label);
      await page.getByLabel("Required parameter", { exact: true }).nth(index).check();
      await page.getByLabel(`Bind workflow parameter ${index + 1}`).selectOption(`${workflowId}:${name}`);
      await page.getByLabel(`Choices workflow for ${name}`).selectOption(workflowId);
      await page.getByLabel(`Choices node for ${name}`).selectOption(name === "class_name" ? base : peers);
      await page.getByLabel(`Choices field for ${name}`).selectOption(column);
    }
    await page.getByRole("button", { name: "Add navigation link", exact: true }).click();
    await page.getByLabel("Navigation link label 1").fill("К классу");
    await page.getByLabel("Destination dashboard").selectOption(previous.dashboardId);
    await page.getByLabel("Navigation value for class_name").selectOption("parameter:class_name");
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await author.saved();
    // Class table holds both identifiers. Its outgoing link is editable like any widget action.
    await page.goto(`/projects/${projectId}/dashboard?dashboard=${previous.dashboardId}&parameters=${encodeURIComponent(JSON.stringify({ class_name: oracle.navigation.class_rows[0].name }))}`);
    await page.getByText("Widget navigation", { exact: true }).click();
    await page.getByLabel("Configure widget navigation").selectOption({ label: "Услуги класса" });
    const widgetNavigation = page.locator("details").filter({ has: page.getByText("Widget navigation", { exact: true }) });
    await widgetNavigation.getByLabel("Destination dashboard").selectOption(dashboardId);
    await widgetNavigation.getByLabel("Navigation value for class_name").selectOption(`field:${category}`);
    await widgetNavigation.getByLabel("Navigation value for service_id").selectOption("field:col_39");
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await author.saved();
    await page.getByRole("table").locator("tbody tr").first().click();
    await expect(page.getByLabel("Dashboard name")).toHaveValue("Услуга");
    await expect(page.locator("[data-widget-id]")).toHaveCount(widgets.length);
    await page.reload();
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    for (const node of initial.nodes) expect(graph.nodes.find((item: { id: string }) => item.id === node.id)).toEqual(node);
    completed = true;
  } finally {
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflowId}`)).json();
    writeFileSync(output, JSON.stringify({ projectId, workflowId, dashboardId, completed, branches, createdNodes: author.created, widgets, graph }, null, 2));
  }
});
