import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("guided profit, margin and target-gap chain survives edits and reload without manual field IDs", async ({ page, request }) => {
  test.setTimeout(120_000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Chained financial measures" } })).json();
  const root = `${api}/api/v1/projects/${project.id}`;
  try {
    const source = await (await request.post(`${root}/imports`, { multipart: { connector: "csv", file: { name: "finance.csv", mimeType: "text/csv", buffer: Buffer.from("revenue,cost\n100.00,70.00\n50.00,20.00\n80.00,100.00\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    await page.goto(`/projects/${project.id}/build`);
    await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption(snapshot.id);
    await page.getByLabel("Report name", { exact: true }).fill("Profitability");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    for (const [index, name, field] of [[0, "Revenue", "revenue"], [1, "Cost", "cost"]] as const) {
      await page.getByRole("button", { name: "Add measure", exact: true }).click();
      await page.getByLabel("Measure name", { exact: true }).nth(index).fill(name);
      await page.getByRole("combobox", { name: "Field", exact: true }).nth(index).selectOption({ label: field });
    }
    await page.getByRole("button", { name: "Check after-total fields", exact: true }).click();
    const summary = page.getByRole("group", { name: "Formulas after totals", exact: true });
    const row = (index: number) => summary.getByRole("region", { name: `Formula ${index}`, exact: true });
    const add = async (name: string, index: number) => {
      const button = summary.getByRole("button", { name: "Add after-total formula", exact: true });
      await expect(button).toBeEnabled(); await button.focus(); await page.keyboard.press("Enter");
      await expect(row(index).getByLabel("Formula name", { exact: true })).toBeFocused();
      await page.keyboard.type(name);
    };
    const insert = async (index: number, label: string) => {
      await row(index).getByLabel("Insert formula field", { exact: true }).selectOption({ label: `${label} · decimal` });
      await expect(row(index).getByLabel("Expression", { exact: true })).toBeFocused();
    };
    await add("Profit", 1);
    await insert(1, "Revenue"); await page.keyboard.type(" - "); await insert(1, "Cost");
    await page.getByRole("button", { name: "Check after-total fields", exact: true }).click();
    await add("Margin %", 2);
    await insert(2, "Profit"); await page.keyboard.type(" / nullif("); await insert(2, "Revenue"); await page.keyboard.type(", 0) * 100");
    await page.getByRole("button", { name: "Check after-total fields", exact: true }).click();
    await add("Target gap", 3);
    await insert(3, "Margin %"); await page.keyboard.type(" - 20");
    // A temporary formula can be removed without losing the chain or keyboard position.
    await add("Temporary", 4);
    await row(4).getByRole("button", { name: "Remove formula", exact: true }).focus(); await page.keyboard.press("Enter");
    await expect(row(3).getByLabel("Formula name", { exact: true })).toBeFocused();
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    for (const value of ["40.00", "17.39", "-2.61"]) await expect(page.getByRole("cell", { name: value, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\?/);
    await page.reload();
    await expect(page.getByRole("cell", { name: "-2.61", exact: true })).toBeVisible();
    await page.getByLabel("Widget actions", { exact: true }).click();
    await page.getByRole("link", { name: "Edit in report wizard", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Check after-total fields", exact: true }).click();
    await expect(row(2).getByRole("option", { name: "Profit · decimal", exact: true })).toBeAttached();
    await row(1).getByLabel("Formula name", { exact: true }).fill("Net profit");
    const firstExpression = row(1).getByLabel("Expression", { exact: true });
    await firstExpression.fill(`${await firstExpression.inputValue()} - 10`);
    await expect(row(2).getByRole("option", { name: "Profit · decimal", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Check after-total fields", exact: true }).click();
    await expect(row(2).getByRole("option", { name: "Net profit · decimal", exact: true })).toBeAttached();
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Preview calculation", exact: true }).click();
    for (const value of ["30.00", "13.04", "-6.96"]) await expect(page.getByRole("cell", { name: value, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\?/); await page.reload();
    await expect(page.getByRole("columnheader", { name: "Net profit", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "-6.96", exact: true })).toBeVisible();
    expect((await (await request.get(`${root}/workflows`)).json()).items).toHaveLength(1);
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${root}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
