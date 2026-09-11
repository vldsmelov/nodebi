import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("slow save acknowledgements cannot discard newer edits", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Slow saves" } })).json();
  const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Main" } })).json();
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const incoming = new Promise<void>(resolve => { started = resolve; });
  let first = true;
  try {
    await page.route(`**/api/v1/workflows/${workflow.id}`, async route => {
      if (first && route.request().method() === "PUT") {
        first = false; started(); await gate;
      }
      await route.continue();
    });
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByTitle("Add Select Columns").click();
    await incoming;
    await page.getByTitle("Add Rename Columns").click();
    await expect(page.locator(".react-flow__node")).toHaveCount(2);
    release();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const saved = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    expect(saved.nodes.map((node: { type: string }) => node.type).sort()).toEqual(["rename_columns", "select_columns"]);
    expect(saved.revision).toBe(3);
  } finally {
    release();
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});

test("navigation before debounce preserves and restores the unsaved draft", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Navigation draft" } })).json();
  const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Main" } })).json();
  try {
    await page.goto(`/projects/${project.id}/workflow`);
    await expect(page.getByTitle("Add Select Columns")).toBeVisible();
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.getByTitle("Add Select Columns").click();
    const dialog = page.waitForEvent("dialog");
    const leaving = page.getByRole("link", { name: "Project", exact: false }).click();
    await (await dialog).accept();
    await leaving;
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
    const before = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    expect(before.nodes).toHaveLength(0);
    await page.clock.resume();
    await page.goto(`/projects/${project.id}/workflow`);
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const restored = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    expect(restored.nodes).toHaveLength(1);
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});

test("two tabs reject stale saves without losing the local draft", async ({ page, context, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Two tabs" } })).json();
  const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Main" } })).json();
  const second = await context.newPage();
  try {
    await page.goto(`/projects/${project.id}/workflow`);
    await second.goto(`/projects/${project.id}/workflow`);
    await expect(second.getByTitle("Add Rename Columns")).toBeVisible();
    await page.getByTitle("Add Select Columns").click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await second.getByTitle("Add Rename Columns").click();
    await expect(second.getByRole("alert").filter({ hasText: "changed elsewhere" })).toContainText("changed elsewhere");
    await expect(second.locator(".react-flow__node")).toHaveCount(1);
    const saved = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    expect(saved.nodes.map((node: { type: string }) => node.type)).toEqual(["select_columns"]);
    expect(await second.evaluate((id) => JSON.parse(sessionStorage.getItem(`nodebi:workflow-draft:${id}`)!).draft.nodes[0].type, workflow.id)).toBe("rename_columns");
  } finally {
    await second.close();
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});

test("failed autosave recovers after reload and retries the pending graph", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Recovery" } })).json();
  const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Main" } })).json();
  let fail = true;
  try {
    await page.route(`**/api/v1/workflows/${workflow.id}`, (route) =>
      fail && route.request().method() === "PUT" ? route.abort("failed") : route.continue());
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByTitle("Add Select Columns").click();
    await expect(page.getByRole("alert").filter({ hasText: "Failed to fetch" })).toContainText("Failed to fetch");
    fail = false;
    await page.reload();
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    const saved = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    expect(saved.nodes).toHaveLength(1);
    expect(saved.revision).toBe(2);
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});

test("editor creates, saves, previews and restores an Excel source", async ({ page, request }) => {
  const projectResponse = await request.post(`${api}/api/v1/projects`, { data: { name: "Editor acceptance" } });
  expect(projectResponse.ok()).toBeTruthy();
  const project = await projectResponse.json();
  try {
    const uploaded = await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, {
      multipart: { file: { name: "sales.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve("../fixtures/excel/sales.xlsx")) } },
    });
    expect(uploaded.ok()).toBeTruthy();
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "Create workflow", exact: true }).click();
    await page.getByTitle("Add Excel Source").click();
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Preview output" })).toBeEnabled();
    await page.getByRole("button", { name: "Preview output" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "quantity", exact: true })).toBeVisible();
    const workflows = await (await request.get(`${api}/api/v1/projects/${project.id}/workflows`)).json();
    const before = await (await request.get(`${api}/api/v1/workflows/${workflows.items[0].id}`)).json();
    await page.reload();
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    const after = await (await request.get(`${api}/api/v1/workflows/${workflows.items[0].id}`)).json();
    expect(after.nodes).toEqual(before.nodes);
    expect(after.version).toBe(1);
  } finally {
    await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`);
  }
});
