import { test, expect, request as createRequest } from "@playwright/test";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";
for (const presentation of ["table", "bar_chart", "line_chart"]) {
test(`wizard compares calendar months in ${presentation} and edits quarters after reload`, async ({ page, request }) => {
  test.setTimeout(120_000);
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Period comparison acceptance" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "periods.csv", mimeType: "text/csv", buffer: Buffer.from("date,amount\n2026-01-10,1.00\n2026-01-20,9.00\n2026-02-15,15.00\n2026-04-01,20.00\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    profile.fields[0].logical_type = "date";
    const imported = await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } });
    expect(imported.ok()).toBeTruthy();
    const snapshot = await imported.json();
    await page.goto(`/projects/${project.id}/build`);
    await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption(snapshot.id);
    await page.getByLabel("Report name", { exact: true }).fill("Monthly change");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Add measure" }).click();
    await page.getByLabel("Measure name", { exact: true }).fill("Revenue");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("checkbox", { name: "date", exact: true }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Check formula fields", exact: true }).click();
    await expect(page.getByRole("button", { name: "Check formula fields", exact: true })).toBeEnabled();
    await page.getByRole("checkbox", { name: "Compare calendar periods" }).check();
    await page.getByRole("combobox", { name: "Compared measure", exact: true }).selectOption({ label: "Revenue" });
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("combobox", { name: "Presentation", exact: true }).selectOption(presentation);
    await page.getByRole("button", { name: "Preview calculation" }).click();
    await expect(page.getByRole("cell", { name: "5.00", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "50.000000", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}/dashboard`));
    await page.reload();
    if (presentation === "table") await expect(page.getByRole("cell", { name: "50.000000", exact: true })).toBeVisible();
    else await expect(page.getByRole("img", { name: "Monthly change", exact: true }).locator("canvas")).toBeVisible();
    const workflows = await (await request.get(`${api}/api/v1/projects/${project.id}/workflows`)).json();
    const graph = await (await request.get(`${api}/api/v1/workflows/${workflows.items[0].id}`)).json();
    expect(graph.nodes.map((n: { type: string }) => n.type)).toEqual(["dataset_source", "calendar_period", "group_by", "period_comparison"]);
    const visual = await (await request.get(`${api}/api/v1/projects/${project.id}/visualizations`)).json();
    const result = await (await request.post(`${api}/api/v1/visualizations/${visual.items[0].id}/result`, { data: {} })).json();
    expect(result.type).toBe(presentation);
    expect(result.rows.map((r: Record<string, unknown>) => r["Comparison · previous"])).toEqual([null, "10.00", null]);
    if (presentation !== "table") expect(result.additional_series).toEqual([{ field: "Comparison · previous", name: "Comparison · previous" }]);
    await page.getByLabel("Widget actions", { exact: true }).click();
    await page.getByRole("link", { name: "Edit in report wizard" }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: "Compare calendar periods" })).toBeChecked();
    await expect(page.getByRole("combobox", { name: "Calendar grouping", exact: true })).toHaveValue("month");
    await page.getByRole("combobox", { name: "Calendar grouping", exact: true }).selectOption("quarter");
    await page.getByLabel("Comparison name", { exact: true }).fill("Quarter change");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByRole("button", { name: "Preview calculation" }).click();
    await expect(page.getByRole("cell", { name: "-5.00", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save report", exact: true }).click();
    await page.getByRole("link", { name: "Open report", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${project.id}/dashboard`));
    await page.reload();
    if (presentation === "table") await expect(page.getByRole("cell", { name: "-5.00", exact: true })).toBeVisible();
    else await expect(page.getByRole("img", { name: "Monthly change", exact: true }).locator("canvas")).toBeVisible();
    const edited = await (await request.post(`${api}/api/v1/visualizations/${visual.items[0].id}/result`, { data: {} })).json();
    expect(edited.type).toBe(presentation);
    expect(edited.rows.map((r: Record<string, unknown>) => r["Quarter change · previous"])).toEqual([null, "25.00"]);
    const after = await (await request.get(`${api}/api/v1/workflows/${workflows.items[0].id}`)).json();
    expect(after.nodes.map((n: { id: string }) => n.id)).toEqual(graph.nodes.map((n: { id: string }) => n.id));
    expect(after.edges).toEqual(graph.edges);
  } finally {
    const cleanup = await createRequest.newContext();
    expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
    await cleanup.dispose();
  }
});
}
