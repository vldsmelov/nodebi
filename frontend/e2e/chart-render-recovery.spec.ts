import { test, expect } from "@playwright/test";
import { activateByKeyboard } from "./keyboard-navigation";
const api = process.env.NODEBI_E2E_API ?? "http://localhost:8000";

for (const theme of ["light", "dark"]) test(`renderer failure is locally retryable by keyboard in ${theme}`, async ({ page, request }) => {
  await page.addInitScript(() => {
    let fail = true;
    const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof fill>) {
      if (fail && this.canvas.closest('[role="img"]')) { fail = false; throw new Error("Injected one-time chart paint failure"); }
      return fill.apply(this, args);
    };
  });
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Chart render recovery" } })).json();
  try {
    const source = await (await request.post(`${api}/api/v1/projects/${project.id}/imports`, { multipart: { connector: "csv", file: { name: "values.csv", mimeType: "text/csv", buffer: Buffer.from("region,amount\nNorth,10\nSouth,20\n") } } })).json();
    const { profile } = await (await request.post(`${api}/api/v1/imports/${source.id}/inspect`, { data: { resource_id: "table" } })).json();
    const snapshot = await (await request.post(`${api}/api/v1/imports/${source.id}/apply`, { data: { profile, expected_revision: 1, request_id: crypto.randomUUID() } })).json();
    const created = await request.post(`${api}/api/v1/projects/${project.id}/report-builder/apply`, { data: { request_id: crypto.randomUUID(), source_id: source.id, resource_id: "table", expected_snapshot_id: snapshot.id, name: "Revenue", dimensions: [profile.fields[0].field_id], measures: [{ name: "Amount", operation: "sum", column_id: profile.fields[1].field_id }], presentation: "bar_chart" } });
    expect(created.ok()).toBeTruthy(); const ids = await created.json();
    const graph = await (await request.get(`${api}/api/v1/workflows/${ids.workflow_id}`)).json();
    await page.context().addCookies([{ name: "nodebi-theme", value: theme, domain: "localhost", path: "/" }]);
    await page.goto(`/projects/${project.id}/dashboard`);
    const widget = page.locator("[data-widget-id]");
    await expect(widget.getByRole("alert")).toContainText("The chart could not be rendered.");
    await activateByKeyboard(page, page.getByRole("button", { name: "Retry chart", exact: true }));
    const chart = page.getByRole("img", { name: "Revenue", exact: true });
    await expect(chart.locator("canvas")).toBeVisible();
    await expect(chart).toBeFocused();
    await expect(widget.getByRole("alert")).toHaveCount(0);
    await activateByKeyboard(page, page.getByRole("button", { name: "Data table", exact: true }));
    await expect(page.getByRole("cell", { name: "10", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "20", exact: true })).toBeVisible();
    expect(await (await request.get(`${api}/api/v1/workflows/${ids.workflow_id}`)).json()).toEqual(graph);
  } finally {
    await page.goto("about:blank");
    expect((await request.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
  }
});
