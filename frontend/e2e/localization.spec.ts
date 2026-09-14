import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { translations } from "../lib/translations";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
test.use({ storageState: { cookies: [], origins: [] } });

test("dashboard language switches preserve unsaved names and saved state", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Localized dashboard" } })).json();
  try {
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Создать дашборд", exact: true }).click();
    await page.getByLabel("Название дашборда", { exact: true }).fill("Title — Керем");
    await page.getByLabel("Язык", { exact: true }).selectOption("tt");
    await expect(page.getByLabel("Күзәтү тактасы исеме", { exact: true })).toHaveValue("Title — Керем");
    await page.screenshot({ path: test.info().outputPath("dashboard-tt.png") });
    await expect(page.getByText("Сакланмаган үзгәрешләр бар", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Күзәтү тактасын саклау", exact: true }).click();
    await expect(page.getByText("Сакланды", { exact: true })).toBeVisible();
    await page.getByLabel("Тел", { exact: true }).selectOption("en");
    await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Title — Керем");
    await page.reload();
    await expect(page.getByLabel("Dashboard name", { exact: true })).toHaveValue("Title — Керем");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});

test("Russian default, Tatar and English persist across pages without translating user data", async ({ page, request, browser, baseURL }) => {
  const response = await request.get(baseURL!);
  expect(await response.text()).toContain('<html lang="ru">');
  await page.goto("/projects");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await page.getByLabel("Название проекта", { exact: true }).fill("Title — Сатулар");
  await page.getByLabel("Язык", { exact: true }).selectOption("tt");
  await expect(page.getByLabel("Проект исеме", { exact: true })).toHaveValue("Title — Сатулар");
  const created = page.waitForResponse(r => r.url().endsWith("/api/v1/projects") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Проект төзү", exact: true }).click();
  const project = await (await created).json();
  try {
    await page.locator(`a[href="/projects/${project.id}"]`).click();
    await page.getByRole("link", { name: /^Мәгълүмат/ }).click();
    await expect(page.getByRole("heading", { name: "Excel чыганаклары" })).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Тел", { exact: true })).toHaveValue("tt");
    await page.locator('input[type="file"]').setInputFiles({ name: "wrong.txt", mimeType: "text/plain", buffer: Buffer.from("test") });
    await expect(page.getByText(/форматындагы китапны йөкләгез/)).toBeVisible();
    await page.getByLabel("Тел", { exact: true }).selectOption("ru");
    await expect(page.getByText(/Загрузите книгу в формате/)).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(resolve("../fixtures/excel/sales.xlsx"));
    await expect(page.getByRole("columnheader", { name: "quantity", exact: true })).toBeVisible();
    await page.getByLabel("Язык", { exact: true }).selectOption("en");
    await expect(page.getByRole("heading", { name: "Excel sources" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "quantity", exact: true })).toBeVisible();
    // A fresh browser context restores the persisted preference just as a new browser visit does.
    const context = await browser.newContext({ baseURL, storageState: await page.context().storageState() });
    try {
      const fresh = await context.newPage();
      const reopened = await fresh.goto(`/projects/${project.id}`);
      expect(await reopened!.text()).toContain('<html lang="en">');
      await expect(fresh.getByRole("heading", { name: "Title — Сатулар" })).toBeVisible();
      await expect(fresh.getByLabel("Language", { exact: true })).toHaveValue("en");
    } finally { await context.close(); }
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});

test("switching language during autosave retains the active graph and field configuration", async ({ page, request }) => {
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Locale autosave" } })).json();
  const workflow = await (await request.post(`${api}/api/v1/projects/${project.id}/workflows`, { data: { name: "Title" } })).json();
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const incoming = new Promise<void>(resolve => { started = resolve; });
  let writes = 0;
  try {
    const catalog = await (await request.get(`${api}/api/v1/node-catalog`)).json();
    for (const node of catalog.items) {
      expect(translations[node.display_name], node.display_name).toBeDefined();
      expect(translations[node.description], node.description).toBeDefined();
      for (const port of [...node.input_ports, ...node.output_ports]) expect(translations[port.display_name], port.display_name).toBeDefined();
    }
    await page.route(`**/api/v1/workflows/${workflow.id}`, async route => {
      if (route.request().method() === "PUT") { writes++; if (writes === 1) { started(); await gate; } }
      await route.continue();
    });
    await page.goto(`/projects/${project.id}/workflow`);
    await expect(page.getByTitle("Добавить: Сортировка", { exact: true })).toContainText("Сортировка");
    await expect(page.getByRole("heading", { name: "Преобразования", exact: true })).toBeVisible();
    await page.getByTitle("Добавить: Ограничение строк", { exact: true }).click();
    await page.getByLabel("Максимум строк").fill("17");
    await incoming;
    await page.getByLabel("Язык", { exact: true }).selectOption("tt");
    await expect(page.getByLabel("Юлларның иң зур саны")).toHaveValue("17");
    await page.screenshot({ path: test.info().outputPath("workflow-tt.png") });
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    release();
    await expect(page.getByText("Сакланды", { exact: true })).toBeVisible();
    const saved = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    expect(saved.name).toBe("Title");
    expect(saved.nodes[0].config).toEqual({ limit: 17 });
    const count = writes;
    await page.getByLabel("Тел", { exact: true }).selectOption("en");
    await expect(page.getByLabel("Maximum rows")).toHaveValue("17");
    await page.getByLabel("Language", { exact: true }).selectOption("ru");
    await expect(page.getByLabel("Максимум строк")).toHaveValue("17");
    await expect(page.getByText("Сохранено", { exact: true })).toBeVisible();
    // A language switch must also leave the debounce timer alive before any request starts.
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await page.getByLabel("Максимум строк").fill("23");
    await page.getByLabel("Язык", { exact: true }).selectOption("tt");
    await expect(page.getByLabel("Юлларның иң зур саны")).toHaveValue("23");
    await page.clock.resume();
    await expect(page.getByText("Сакланды", { exact: true })).toBeVisible();
    const latest = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    expect(latest.nodes[0].config).toEqual({ limit: 23 });
    expect(writes).toBe(count + 1);
    await page.reload();
    await expect(page.locator(".react-flow__node")).toHaveCount(1);
    expect(writes).toBe(count + 1);
    const restored = await (await request.get(`${api}/api/v1/workflows/${workflow.id}`)).json();
    expect(restored).toEqual(latest);
  } finally { release(); await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
