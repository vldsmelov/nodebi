import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("retained P&L layout, titles and all language/theme combinations", async ({ page, request }) => {
  test.skip(process.env.NODEBI_ALMA_DEMO !== "1", "Uses the explicitly retained synthetic authoring project");
  test.setTimeout(120000);
  const record = JSON.parse(readFileSync(resolve("../.backups/alma-demo.json"), "utf8"));
  await page.goto(record.url.replace("mode=view", "mode=edit"));
  await page.getByLabel("Dashboard name", { exact: true }).fill("Synthetic P&L - four workbooks");
  const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
  const boards = (await (await request.get(`${api}/api/v1/projects/${record.projectId}/dashboards`)).json()).items;
  const visuals = (await (await request.get(`${api}/api/v1/projects/${record.projectId}/visualizations`)).json()).items;
  const board = boards.find((item: {id: string}) => item.id === new URL(record.url).searchParams.get("dashboard"));
  for (const widget of board.widgets) {
    const title = visuals.find((item: {id: string}) => item.id === widget.visualization_id).name;
    await page.locator(`[data-widget-id="${widget.id}"]`).getByLabel("Widget title", { exact: true }).fill(title);
  }
  await page.getByRole("button", { name: "Layout templates", exact: true }).click();
  const apply = page.getByRole("button", { name: "Apply layout template", exact: true });
  if (await apply.isEnabled()) await apply.click(); else await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  const save = page.getByRole("button", { name: "Save dashboard", exact: true });
  if (await save.isEnabled()) await save.click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View dashboard", exact: true }).click();
  let languageLabel = "Language";
  for (const [locale, language, theme] of [["ru", "Язык", "Тема"], ["tt", "Тел", "Тема"], ["en", "Language", "Theme"]]) {
    await page.getByLabel(languageLabel, { exact: true }).selectOption(locale); languageLabel = language;
    for (const value of ["light", "dark"]) {
      await page.getByLabel(theme, { exact: true }).selectOption(value);
      await expect(page.locator("html")).toHaveAttribute("data-theme", value);
      await expect(page.locator("[data-widget-id]")).toHaveCount(5);
      await expect(page.locator("[data-widget-id]").filter({ hasText: "Monthly P&L table" })).toContainText("2026-03");
      await expect(page.getByRole("heading", { name: "Total net profit", exact: true })).toBeVisible();
      await page.screenshot({ path: test.info().outputPath(`${locale}-${value}.png`), fullPage: true });
    }
  }
  await page.reload();
  await expect(page.getByText("Synthetic P&L - four workbooks", { exact: true })).toBeVisible();
});
