import { expect, test } from "@playwright/test";
import { ConstructorAuthor } from "./constructor-author";

test("calendar and a conditional field are editable without a workbook or field IDs", async ({ page, request }) => {
  test.setTimeout(60000);
  const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Calendar conditions" } })).json();
  try {
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "New field workflow", exact: true }).click();
    await expect(page.getByRole("region", { name: "Next step", exact: true })).toBeVisible();
    const author = new ConstructorAuthor(page);
    const calendar = await author.add("Calendar", null, async () => {
      await page.getByLabel("Start date", { exact: true }).fill("2024-02-28");
      await page.getByLabel("End date", { exact: true }).fill("2024-03-01");
    });
    const year = await author.calc(calendar, "Year", "year(Date)");
    await author.add("Calculated Column", year, async () => {
      await page.getByLabel("Output field name", { exact: true }).fill("Label");
      await page.getByText("Build a condition", { exact: true }).click();
      await page.getByLabel("Condition field", { exact: true }).selectOption({ label: "Year" });
      await page.getByLabel("Condition value", { exact: true }).fill("2024");
      await page.getByLabel("When true", { exact: true }).fill("Leap year");
      await page.getByLabel("Otherwise", { exact: true }).fill("Other");
      await page.getByRole("button", { name: "Use condition", exact: true }).click();
    });
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.locator("table tbody tr")).toHaveCount(3);
    await expect(page.locator("table")).toContainText("Leap year");
    await page.reload(); await expect(page.locator(".react-flow__node-fieldNode")).toHaveCount(3);
  } finally { await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`); }
});
