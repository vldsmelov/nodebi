import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

test("wizard failures retain settings, focus feedback and retry the original import; dynamic rows retain keyboard focus", async ({ page, request }) => {
  test.setTimeout(120_000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Wizard feedback acceptance" } })).json();
  const root = `${api}/api/v1/projects/${project.id}`;
  const activate = async (name: string) => {
    const button = page.getByRole("button", { name, exact: true });
    await expect(button).toBeEnabled(); await button.focus(); await page.keyboard.press("Enter");
  };
  try {
    // Seed only the original file; all mapping, checks and apply use the actual wizard.
    const source = await (await request.post(`${root}/imports`, { multipart: { connector: "csv", file: { name: "sales.csv", mimeType: "text/csv", buffer: Buffer.from("category,amount\nA,0.10\nA,0.20\nB,0.50\n") } } })).json();
    await page.goto(`/projects/${project.id}/data/import?source=${source.id}`);
    await activate("Inspect fields");
    await page.getByLabel("Dataset name", { exact: true }).fill("Retained sales");
    await page.getByLabel("Data type").nth(1).selectOption("decimal");
    await page.route(`${root}/imports/${source.id}/draft`, route => route.abort("connectionreset"), { times: 1 });
    await activate("Save import draft");
    await expect(page.getByRole("alert", { name: "Import action failed" })).toBeFocused();
    await expect(page.getByLabel("Dataset name", { exact: true })).toHaveValue("Retained sales");
    await expect(page.getByLabel("Data type").nth(1)).toHaveValue("decimal");
    // A different successful operation must clear the earlier save failure.
    await activate("Check all rows");
    await expect(page.getByRole("heading", { name: "Check and apply", exact: true })).toBeFocused();
    await expect(page.getByRole("alert", { name: "Import action failed" })).toHaveCount(0);
    const attempts: unknown[] = [];
    await page.route(`${api}/api/v1/imports/${source.id}/apply`, async route => {
      attempts.push(route.request().postDataJSON());
      if (attempts.length === 1) {
        const response = await route.fetch(); expect(response.ok()).toBeTruthy();
        await route.abort("connectionreset");
      } else await route.continue();
    });
    await activate("Apply import");
    await expect(page.getByRole("alert", { name: "Import action failed" })).toBeFocused();
    await activate("Apply import");
    await expect(page.getByRole("heading", { name: "Dataset is ready", exact: true })).toBeFocused();
    expect(attempts).toHaveLength(2); expect(attempts[1]).toEqual(attempts[0]);
    const datasets = await (await request.get(`${root}/datasets`)).json();
    expect(datasets).toHaveLength(1);
    await page.goto(`/projects/${project.id}/build`);
    await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption(datasets[0].id);
    await page.getByLabel("Report name", { exact: true }).fill("Retained report");
    await activate("Next");
    for (const name of ["Revenue", "Temporary", "Average"]) {
      await activate("Add measure");
      await expect(page.getByLabel("Measure name", { exact: true }).last()).toBeFocused();
      await page.keyboard.press("Control+A"); await page.keyboard.type(name);
    }
    await page.getByRole("combobox", { name: "Aggregation", exact: true }).last().selectOption("average");
    await page.getByRole("button", { name: "Remove measure", exact: true }).nth(1).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Measure name", { exact: true }).last()).toBeFocused();
    await expect(page.getByLabel("Measure name", { exact: true }).last()).toHaveValue("Average");
    await expect(page.getByRole("combobox", { name: "Aggregation", exact: true }).last()).toHaveValue("average");
    await page.route(`${root}/report-builder/fields`, route => route.abort("connectionreset"), { times: 1 });
    await activate("Check formula fields");
    await expect(page.getByRole("alert", { name: "Report check failed" })).toBeFocused();
    await activate("Next"); await activate("Next");
    await activate("Add filter");
    await expect(page.getByRole("combobox", { name: "Field", exact: true })).toBeFocused();
    await page.getByLabel("Value", { exact: true }).fill("A");
    await activate("Add filter");
    await expect(page.getByRole("combobox", { name: "Field", exact: true }).last()).toBeFocused();
    await page.getByRole("button", { name: "Remove filter", exact: true }).last().focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("combobox", { name: "Field", exact: true })).toBeFocused();
    await expect(page.getByLabel("Value", { exact: true })).toHaveValue("A");
    await activate("Remove filter");
    await expect(page.getByRole("button", { name: "Add filter", exact: true })).toBeFocused();
    await activate("Next");
    await page.route(`${root}/report-builder/preview`, route => route.abort("connectionreset"), { times: 1 });
    await activate("Preview calculation");
    await expect(page.getByRole("alert", { name: "Report check failed" })).toBeFocused();
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeDisabled();
    await activate("Preview calculation");
    await expect(page.getByRole("button", { name: "Save report", exact: true })).toBeEnabled();
    await expect(page.getByRole("alert", { name: "Report check failed" })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "0.80", exact: true })).toBeVisible();
    // Field/preview retries must not create any saved calculations.
    expect((await (await request.get(`${root}/workflows`)).json()).items).toHaveLength(0);
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${root}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
