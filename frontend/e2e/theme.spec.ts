import { showAllOperations } from "./operation-catalog";
import { expect, test } from "@playwright/test";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";

test("light theme persists in server rendering and keeps language and form drafts", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Theme", { exact: true }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("main")).toHaveCSS("background-color", "rgb(244, 246, 250)");
  await page.screenshot({ path: test.info().outputPath("home-light.png"), fullPage: true });
  await page.getByRole("link", { name: "Create your first project" }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Unsaved project name");
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue("Unsaved project name");
  await page.getByLabel("Theme", { exact: true }).selectOption("light");
  await page.getByLabel("Language", { exact: true }).selectOption("ru");
  await expect(page.getByLabel("Тема", { exact: true })).toHaveValue("light");
  await expect(page.getByLabel("Название проекта", { exact: true })).toHaveValue("Unsaved project name");
  const response = await page.reload();
  expect(await response!.text()).toContain('data-theme="light"');
  await expect(page.getByLabel("Тема", { exact: true })).toHaveValue("light");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.locator("body")).toHaveCSS("color-scheme", "light");
  await page.getByLabel("Язык", { exact: true }).selectOption("tt");
  await expect(page.getByRole("option", { name: "Якты", exact: true })).toHaveAttribute("value", "light");
});

test("theme changes before autosave preserve graph configuration without extra saves", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Theme autosave" } })).json();
  const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Theme graph" } })).json();
  try {
    await page.goto(`/projects/${project.id}/workflow`);
    await expect(page.getByTitle("Add Limit", { exact: true })).toBeVisible();
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await showAllOperations(page); await page.getByTitle("Add Limit", { exact: true }).click();
    await page.getByLabel("Maximum rows").fill("17");
    await page.getByLabel("Theme", { exact: true }).selectOption("light");
    await expect(page.getByLabel("Maximum rows")).toHaveValue("17");
    await expect(page.locator(".react-flow")).toHaveClass(/light/);
    await page.clock.resume();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath("workflow-light.png"), fullPage: true });
    const saved = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    expect(saved.nodes[0].config).toEqual({ limit: 17 });
    await page.getByLabel("Theme", { exact: true }).selectOption("dark");
    await expect(page.locator(".react-flow")).toHaveClass(/dark/);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    const restored = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    expect(restored).toEqual(saved);
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
