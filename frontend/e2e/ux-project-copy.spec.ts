import { expect, test, type APIResponse } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Workflow } from "../features/workflow/types";
import type { Dashboard } from "../features/dashboard/api";
import { remapIdentities } from "./copy-identities";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
const path = resolve("../.backups/ux-project-copy.json");
export type CopyRecord = { projectId: string; workflowId: string; ids: Record<string, string>; originalGraph: Workflow; originalDashboards: Dashboard[]; copied: boolean; presented?: boolean; labeled?: boolean; workbookSha256: string };
const json = async <T,>(response: APIResponse): Promise<T> => { expect(response.ok(), await response.text()).toBe(true); return response.json(); };

test("retain an independent reference project copy and apply dashboard presentation through the UI", async ({ page, request, baseURL }) => {
  test.skip(process.env.NODEBI_UX_COPY !== "1", "Opt-in retained private project copy; requires database/source backups");
  test.setTimeout(300000);
  expect(existsSync(resolve("../.backups/u5-before.dump"))).toBe(true);
  expect(existsSync(resolve("../.backups/u5-sources.tar"))).toBe(true);
  const reference = JSON.parse(readFileSync(resolve("../.backups/reference-finalized-project.json"), "utf8"));
  const readGraph = (id: string) => request.get(`${api}/api/v1/workflows/${id}`).then(json<Workflow>);
  const readBoards = (id: string) => request.get(`${api}/api/v1/projects/${id}/dashboards`).then(json<{ items: Dashboard[] }>).then(result => result.items);
  let record: CopyRecord;
  if (existsSync(path)) {
    record = JSON.parse(readFileSync(path, "utf8"));
    expect(record.copied || process.env.NODEBI_UX_RESUME_COPY === "1", "Inspect the retained partial copy before explicitly resuming; do not create duplicates.").toBe(true);
  } else {
    const originalGraph = await readGraph(reference.workflowId), originalDashboards = await readBoards(reference.projectId);
    const sources = await json<{ items: { id: string; original_filename: string }[] }>(await request.get(`${api}/api/v1/projects/${reference.projectId}/sources`));
    expect(sources.items).toHaveLength(1);
    const workbook = readFileSync(resolve("../data/data_example.xlsx"));
    const workbookSha256 = createHash("sha256").update(workbook).digest("hex");
    writeFileSync(resolve("../.backups/ux-original-snapshot.json"), JSON.stringify({ originalGraph, originalDashboards, sources, workbookSha256 }, null, 2));
    const project = await json<{ id: string }>(await request.post(`${api}/api/v1/projects`, { data: { name: "Анализ услуг — удобный конструктор (U5)" } }));
    record = { projectId: project.id, workflowId: "", ids: { [reference.projectId]: project.id }, originalGraph, originalDashboards, copied: false, workbookSha256 };
    const checkpoint = () => writeFileSync(path, JSON.stringify(record, null, 2)); checkpoint();
    const source = await json<{ id: string }>(await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: sources.items[0].original_filename, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: workbook } } }));
    record.ids[sources.items[0].id] = source.id; checkpoint();
    const flow = await json<Workflow>(await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: originalGraph.name } }));
    record.workflowId = flow.id; record.ids[originalGraph.id] = flow.id; checkpoint();
    for (const item of [...originalGraph.nodes, ...originalGraph.edges, ...originalDashboards.flatMap(board => board.widgets)]) record.ids[item.id] = crypto.randomUUID();
    for (const board of originalDashboards) {
      const copy = await json<Dashboard>(await request.post(`${api}/api/v1/projects/${project.id}/dashboards`, { data: { name: board.name } }));
      record.ids[board.id] = copy.id; checkpoint();
    }
    // Group by actual downstream usage. Only presentation metadata changes here.
    const uses = new Map<string, Set<string>>();
    const visit = (id: string, board: string, visited: Set<string>) => {
      if (visited.has(id)) return; visited.add(id);
      const labels = uses.get(id) ?? new Set<string>(); labels.add(board); uses.set(id, labels);
      for (const edge of originalGraph.edges.filter(edge => edge.target_node_id === id)) visit(edge.source_node_id, board, visited);
    };
    for (const board of originalDashboards) for (const widget of board.widgets) visit(widget.visualization_id, board.name, new Set());
    const graph = remapIdentities(originalGraph, record.ids);
    graph.nodes = graph.nodes.map((node, index) => {
      const consumers = uses.get(originalGraph.nodes[index].id) ?? new Set<string>();
      return { ...node, ui: { ...node.ui, group: consumers.size === 1 ? [...consumers][0] : "Общие расчёты", label: node.config?.title ?? node.config?.name ?? node.ui?.label ?? "" } };
    });
    await json(await request.put(`${api}/api/v1/workflows/${flow.id}`, { data: { name: graph.name, nodes: graph.nodes, edges: graph.edges, parameters: graph.parameters, expected_revision: flow.revision } }));
  }
  if (!record.copied) {
    // Declare every destination parameter first; navigation validates destination contracts.
    for (const navigation of [false, true]) for (const board of record.originalDashboards) {
      const copy = remapIdentities(board, record.ids);
      const current = await json<Dashboard>(await request.get(`${api}/api/v1/dashboards/${copy.id}`));
      const configuration = navigation ? copy.configuration : { ...copy.configuration, links: [] };
      const widgets = navigation ? copy.widgets : copy.widgets.map(widget => ({ ...widget, config: { ...widget.config, action: null } }));
      await json(await request.put(`${api}/api/v1/dashboards/${copy.id}`, { data: { name: copy.name, widgets, configuration, expected_revision: current.revision } }));
    }
    record.copied = true; writeFileSync(path, JSON.stringify(record, null, 2));
  }
  // Exact baseline checks also catch edits to the original since a previous interrupted run.
  expect(await readGraph(reference.workflowId)).toEqual(record.originalGraph);
  expect(await readBoards(reference.projectId)).toEqual(record.originalDashboards);
  const schema = await json<{ valid: boolean }>(await request.get(`${api}/api/v1/workflows/${record.workflowId}/schema`)); expect(schema.valid).toBe(true);
  if (!record.presented) {
    await page.goto(`/projects/${record.projectId}/workflow?workflow=${record.workflowId}`);
    await expect(page.locator(".react-flow__node")).toHaveCount(record.originalGraph.nodes.length);
    await page.getByRole("button", { name: "Arrange by dependencies", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.getByText("Node groups", { exact: true }).click();
    await page.getByLabel("Active group", { exact: true }).selectOption("Общие расчёты");
    await page.getByLabel("Group name", { exact: true }).fill("Подготовка и общие расчёты");
    await page.getByRole("button", { name: "Rename group", exact: true }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const groups = [...new Set((await readGraph(record.workflowId)).nodes.map(node => node.ui?.group as string))];
    for (const name of groups) await page.getByLabel(`Toggle group ${name}`, { exact: true }).click();
    await page.getByRole("button", { name: "Fit view", exact: true }).click();
    await expect(page.getByTestId("collapsed-group")).toHaveCount(groups.length);
    await page.screenshot({ path: resolve("../.backups/ux-copy-groups.png") });
    for (const board of await readBoards(record.projectId)) {
      const values = Object.fromEntries((board.configuration?.parameters ?? []).map(parameter => [parameter.name, reference.sampleValues[parameter.name]]));
      await page.goto(`/projects/${record.projectId}/dashboard?dashboard=${board.id}&parameters=${encodeURIComponent(JSON.stringify(values))}`);
      await page.getByRole("button", { name: "Layout templates", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Layout templates", exact: true });
      const apply = dialog.getByRole("button", { name: "Apply layout template", exact: true });
      if (await apply.isEnabled()) {
        await apply.click(); await page.getByRole("button", { name: "Save dashboard", exact: true }).click();
        await expect(page.getByText("Saved", { exact: true })).toBeVisible();
      } else await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.getByRole("button", { name: "View dashboard", exact: true }).click();
      await expect(page).toHaveURL(/mode=view/);
      await expect(page.getByText("Loading visualization…", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    }
    record.presented = true; writeFileSync(path, JSON.stringify(record, null, 2));
  }
  const reverse = Object.fromEntries(Object.entries(record.ids).map(([from, to]) => [to, from]));
  const presentationGraph = await readGraph(record.workflowId);
  await page.goto(`/projects/${record.projectId}/workflow?workflow=${record.workflowId}`);
  await page.getByText("Node groups", { exact: true }).click();
  const allGroups = [...new Set(presentationGraph.nodes.map(node => node.ui?.group as string))];
  for (const name of allGroups) {
    const button = page.getByLabel(`Toggle group ${name}`, { exact: true });
    if (await button.textContent() === "Collapse group") await button.click();
  }
  await expect(page.getByTestId("collapsed-group")).toHaveCount(allGroups.length);
  await page.getByRole("button", { name: "Fit view", exact: true }).click();
  await page.screenshot({ path: resolve("../.backups/ux-copy-groups-check.png") });
  // IntersectionObserver ratios have floating-point rounding after canvas scaling.
  for (const card of await page.getByTestId("collapsed-group").all()) await expect(card).toBeInViewport({ ratio: 0.999 });
  const boxes = await page.getByTestId("collapsed-group").evaluateAll(elements => elements.map(element => { const { x, y, width, height } = element.getBoundingClientRect(); return { x, y, width, height }; }));
  for (const a of boxes) for (const b of boxes) if (a !== b) expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
  await page.screenshot({ path: resolve("../.backups/ux-copy-groups.png") });
  expect(await readGraph(record.workflowId)).toEqual(presentationGraph);
  const serviceNode = record.originalGraph.nodes.find(node => node.config?.name === "Услуга")!;
  const serviceField = `calc_${record.ids[serviceNode.id].replaceAll("-", "")}`;
  for (const board of await readBoards(record.projectId)) {
    const index = (board.configuration?.parameters ?? []).findIndex(parameter => parameter.name === "service_id");
    if (index < 0) continue;
    const values = Object.fromEntries((board.configuration?.parameters ?? []).map(parameter => [parameter.name, reference.sampleValues[parameter.name]]));
    const parameters = Object.fromEntries((board.configuration?.bindings ?? []).map(binding => [binding.workflow_parameter, values[binding.dashboard_parameter]]));
    const results = async () => {
      const items: unknown[] = [];
      for (const widget of board.widgets) items.push(await json(await request.post(`${api}/api/v1/visualizations/${widget.visualization_id}/result`, { data: { parameters, limit: 1000 } })));
      return items;
    };
    const before = await results();
    await page.goto(`/projects/${record.projectId}/dashboard?dashboard=${board.id}&parameters=${encodeURIComponent(JSON.stringify(values))}`);
    if (!record.labeled) {
      await page.getByText("Dashboard settings", { exact: true }).click();
      await page.getByLabel(`Dashboard parameter label ${index + 1}`, { exact: true }).fill("Услуга");
      await page.getByLabel("Choices label field for service_id", { exact: true }).selectOption(serviceField);
      const save = page.getByRole("button", { name: "Save dashboard", exact: true });
      if (await save.isEnabled()) { await save.click(); await expect(page.getByText("Saved", { exact: true })).toBeVisible(); }
    }
    const selection = page.getByLabel("Dashboard selection service_id", { exact: true });
    await expect(selection).toHaveValue(String(values.service_id));
    await expect(selection.locator("option:checked")).not.toHaveText(String(values.service_id));
    await page.getByRole("button", { name: "Apply selections", exact: true }).click();
    await expect.poll(() => JSON.parse(new URL(page.url()).searchParams.get("parameters")!).service_id).toBe(values.service_id);
    await page.getByRole("button", { name: "View dashboard", exact: true }).click(); await expect(page).toHaveURL(/mode=view/);
    await page.reload(); await expect(selection).toHaveValue(String(values.service_id));
    await expect(selection.locator("option:checked")).not.toHaveText(String(values.service_id));
    expect(await results()).toEqual(before);
    await page.screenshot({ path: resolve(`../.backups/ux-copy-named-selection-${index}.png`), fullPage: true });
  }
  record.labeled = true; writeFileSync(path, JSON.stringify(record, null, 2));
  expect(await readGraph(record.workflowId)).toEqual(presentationGraph);
  const restored = remapIdentities(await readGraph(record.workflowId), reverse);
  const computation = (graph: Workflow) => ({ parameters: graph.parameters, nodes: graph.nodes.map(({ id, type, version, config }) => ({ id, type, version, config })).sort((a, b) => a.id.localeCompare(b.id)), edges: [...graph.edges].sort((a, b) => a.id.localeCompare(b.id)) });
  expect(computation(restored)).toEqual(computation(record.originalGraph));
  for (const board of remapIdentities(await readBoards(record.projectId), reverse)) {
    const original = record.originalDashboards.find(item => item.id === board.id)!;
    const parameter = board.configuration?.parameters?.find(item => item.name === "service_id");
    if (parameter) {
      expect(parameter.label).toBe("Услуга");
      expect(parameter.options?.label_column_id).toBe(`calc_${serviceNode.id.replaceAll("-", "")}`);
      const old = original.configuration!.parameters!.find(item => item.name === "service_id")!;
      parameter.label = old.label; parameter.options!.label_column_id = old.options?.label_column_id;
    }
    expect(board.configuration).toEqual(original.configuration);
    const semantics = (item: Dashboard) => item.widgets.map(({ id, visualization_id, config, title }) => ({ id, visualization_id, config, title })).sort((a, b) => a.id.localeCompare(b.id));
    expect(semantics(board)).toEqual(semantics(original));
  }
  if (process.env.NODEBI_UX_COPY_RESTART === "1") {
    const savedBoards = await readBoards(record.projectId);
    execFileSync("docker", ["compose", "restart", "backend", "postgres", "frontend"], { cwd: resolve(".."), timeout: 45000, windowsHide: true });
    await expect.poll(async () => { try { return (await request.get(`${api}/ready`)).ok() && (await request.get(baseURL!)).ok(); } catch { return false; } }, { timeout: 60000 }).toBe(true);
    expect(await readGraph(record.workflowId)).toEqual(presentationGraph);
    expect(await readBoards(record.projectId)).toEqual(savedBoards);
    await page.reload();
    const selection = page.getByLabel("Dashboard selection service_id", { exact: true });
    await expect(selection).toHaveValue(String(reference.sampleValues.service_id));
    await expect(selection.locator("option:checked")).not.toHaveText(String(reference.sampleValues.service_id));
    await expect(page.getByText("Loading visualization…", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  }
  expect(await readGraph(reference.workflowId)).toEqual(record.originalGraph);
  expect(await readBoards(reference.projectId)).toEqual(record.originalDashboards);
});
