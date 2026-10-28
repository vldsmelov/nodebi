import { test, expect, request as createRequest } from "@playwright/test";
import { configureFormLayout, expectFormFits, formLayouts } from "./form-reflow";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";
test.use({ actionTimeout: 15_000 });

for (const layout of formLayouts) test(`manage both template families, recover requests and reject competing edits (${layout})`, async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  await configureFormLayout(page, layout);
  page.on("dialog", dialog => dialog.accept());
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Template catalog acceptance" } })).json();
  const root = `${api}/api/v1/projects/${project.id}`;
  try {
    const source = await (await request.post(`${root}/imports`, { multipart: { connector: "csv", file: { name: "amounts.csv", mimeType: "text/csv", buffer: Buffer.from("group,amount\nA,1.00\nA,2.00\nB,3.00\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const [group, amount] = profile.fields.map((field: { field_id: string }) => field.field_id);
    const input = { source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id };
    const captured: { id: string; family: string; visual: string; workflow: string; result: unknown; graph: unknown }[] = [];
    for (const family of ["report", "analytical"]) {
      const endpoint = family === "report" ? "report-builder" : "statistical-reports";
      const settings = family === "report"
        ? { dimensions: [group], measures: [{ output_id: crypto.randomUUID(), name: "Amount", operation: "sum", column_id: amount }], presentation: "bar_chart" }
        : { analysis: { type: "histogram", value_column_id: amount, bin_count: 2 } };
      const response = await request.post(`${root}/${endpoint}/apply`, { data: { ...input, ...settings, name: family, request_id: crypto.randomUUID() } });
      expect(response.ok(), await response.text()).toBeTruthy();
      const ids = await response.json();
      const view = await (await request.get(`${root}/${endpoint}/${ids.visualization_id}`)).json();
      const template = await request.post(`${root}/${family}-templates`, { data: { request_id: crypto.randomUUID(), visualization_id: ids.visualization_id, expected_token: view.expected_token, name: `${family} amounts`, input_grain: "One transaction, RUB" } });
      expect(template.ok(), await template.text()).toBeTruthy();
      captured.push({ id: (await template.json()).id, family, visual: ids.visualization_id, workflow: ids.workflow_id, graph: await (await request.get(`${api}/api/v1/workflows/${ids.workflow_id}`)).json(), result: await (await request.post(`${api}/api/v1/visualizations/${ids.visualization_id}/result`, { data: {} })).json() });
    }
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("link", { name: "Template catalog", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Template catalog", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reports", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "report amounts", exact: true })).toBeVisible();
    const card = (name: string) => page.getByRole("listitem").filter({ has: page.getByRole("heading", { name, exact: true }) });
    const standard = captured[0];
    await card("report amounts").getByRole("button", { name: "Rename", exact: true }).click();
    await expect(page.getByLabel("Template name", { exact: true })).toBeFocused();
    await page.getByLabel("Template name", { exact: true }).fill("Renamed revenue");
    await expectFormFits(page);
    page.removeAllListeners("dialog"); page.once("dialog", dialog => dialog.dismiss());
    await page.getByRole("link", { name: "Reports", exact: true }).click();
    await expect(page.getByLabel("Template name", { exact: true })).toHaveValue("Renamed revenue");
    await expect(page).toHaveURL(/\/templates$/);
    page.on("dialog", dialog => dialog.accept());
    const sends: string[] = [];
    await page.route(`**/template-catalog/${standard.id}`, async route => {
      sends.push(route.request().postData()!);
      if (sends.length === 1) { expect((await route.fetch()).ok()).toBeTruthy(); await route.abort("connectionreset"); }
      else await route.continue();
    });
    await page.getByRole("button", { name: "Save name", exact: true }).click();
    await expect(page.getByRole("button", { name: "Retry catalog change", exact: true })).toBeEnabled();
    await page.route("**/template-catalog?*", route => route.abort("connectionreset"));
    await page.reload();
    await page.getByRole("button", { name: "Retry catalog change", exact: true }).click();
    await expect(page.getByText("Template catalog updated. Existing reports are unchanged.", { exact: true })).toBeVisible();
    expect(sends).toHaveLength(2); expect(sends[0]).toBe(sends[1]);
    await page.unroute("**/template-catalog?*");
    await page.unroute(`**/template-catalog/${standard.id}`);
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(card("Renamed revenue")).toBeVisible();
    // A competing authoring tab changes the same revision before this form saves.
    await card("Renamed revenue").getByRole("button", { name: "Rename", exact: true }).click();
    await page.getByLabel("Template name", { exact: true }).fill("Stale overwrite");
    const competing = await request.patch(`${root}/template-catalog/${standard.id}`, { data: { request_id: crypto.randomUUID(), expected_revision: 2, name: "Other tab" } });
    expect(competing.ok()).toBeTruthy();
    await page.getByRole("button", { name: "Save name", exact: true }).click();
    await expect(page.getByRole("alert", { name: "Template change failed" })).toBeFocused();
    await page.getByRole("button", { name: "Reload template list", exact: true }).click();
    await expect(card("Other tab")).toBeVisible();
    await card("Other tab").getByRole("button", { name: "Archive template", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Other tab", exact: true })).toHaveCount(0);
    expect((await (await request.get(`${root}/report-templates`)).json()).items).toHaveLength(0);
    await page.getByRole("combobox", { name: "Catalog state", exact: true }).selectOption("archived");
    await card("Other tab").getByRole("button", { name: "Restore template", exact: true }).click();
    await page.getByRole("combobox", { name: "Catalog state", exact: true }).selectOption("all");
    await expect(card("Other tab")).toBeVisible();
    await page.getByLabel("Search templates", { exact: true }).fill("TRANSACTION");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.getByRole("combobox", { name: "Template family", exact: true }).selectOption("analytical");
    await expect(card("analytical amounts")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Other tab", exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("catalog-light.png"), fullPage: true, animations: "disabled" });
    await expectFormFits(page);
    await page.context().addCookies([{ name: "nodebi-theme", value: "dark", url: testInfo.project.use.baseURL! }, { name: "nodebi-language", value: "ru", url: testInfo.project.use.baseURL! }]);
    await page.setViewportSize({ width: 390, height: 844 }); await page.reload();
    await expect(page.getByRole("heading", { name: "Каталог шаблонов", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Other tab", exact: true })).toBeVisible();
    const overflow = await page.evaluate(() => [...document.querySelectorAll("body *")].flatMap(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && (rect.left < 0 || rect.right > innerWidth) ? [{ tag: element.tagName, classes: element.className, text: element.textContent?.slice(0, 60), left: rect.left, right: rect.right }] : [];
    }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), JSON.stringify(overflow)).toBe(true);
    expect(overflow).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("catalog-dark-narrow.png"), fullPage: true, animations: "disabled" });
    for (const original of captured) {
      expect(await (await request.get(`${api}/api/v1/workflows/${original.workflow}`)).json()).toEqual(original.graph);
      expect(await (await request.post(`${api}/api/v1/visualizations/${original.visual}/result`, { data: {} })).json()).toEqual(original.result);
    }
    expect(errors).toEqual([]);
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${root}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
