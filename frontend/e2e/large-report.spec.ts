import { expect, request as createRequest, test } from "@playwright/test";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const api = process.env.NODEBI_EVOLUTION_API ?? "http://localhost:8010";

for (const width of [3, 20]) {
  test(`100k rows x ${width}: bounded import and exact report stay interactive`, async ({ page, request }, testInfo) => {
    test.setTimeout(180_000);
    const rows = 100_000;
    const content = [
      ["code", "category", "amount", ...Array.from({ length: width - 3 }, (_, i) => `extra_${i}`)].join(","),
      ...Array.from({ length: rows }, (_, i) => [String(i).padStart(12, "0"), `Group ${i % 10}`, "0.01", ...Array(width - 3).fill("0.01")].join(",")),
    ].join("\n");
    const fixturePath = testInfo.outputPath("large.csv");
    await mkdir(dirname(fixturePath), { recursive: true });
    await writeFile(fixturePath, content);
    const created = await request.post(`${api}/api/v1/projects`, { data: { name: `Large report ${width} ${Date.now()}` } });
    expect(created.ok()).toBeTruthy();
    const project = await created.json();
    const evidence: Record<string, unknown>[] = [];
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      const durations: number[] = [];
      Object.assign(window, { nodebiLongTasks: durations });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) durations.push(entry.duration);
      }).observe({ type: "longtask", buffered: true });
    });
    const sample = async (stage: string, started: number) => {
      const durations = await page.evaluate(() => (window as unknown as { nodebiLongTasks: number[] }).nodebiLongTasks.splice(0));
      evidence.push({ stage, elapsedMs: Date.now() - started, longTasks: durations.length, maxLongTaskMs: Math.max(0, ...durations) });
      // Local acceptance budget, not a claim about field INP or every user device.
      expect(Math.max(0, ...durations), `${stage}: main thread blocked for over 1 second`).toBeLessThan(1000);
    };
    try {
      let started = Date.now();
      await page.goto(`/projects/${project.id}/data/import`);
      await page.getByRole("radio", { name: "CSV" }).check();
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.getByLabel("File", { exact: true }).setInputFiles(fixturePath);
      await page.getByRole("button", { name: "Upload and continue" }).click();
      await expect(page.getByRole("button", { name: "Inspect fields" })).toBeVisible();
      await sample("upload", started);
      started = Date.now();
      await page.getByRole("button", { name: "Inspect fields" }).click();
      await expect(page.getByLabel("Data type").nth(0)).toHaveValue("string");
      await expect(page.getByLabel("Data type").nth(2)).toHaveValue("decimal");
      await page.getByLabel("Dataset name").fill("Large exact sales");
      await sample("inspect_fields", started);
      started = Date.now();
      const previewResponse = page.waitForResponse(response => response.url().includes("/imports/") && response.url().endsWith("/preview") && response.request().method() === "POST");
      await page.getByRole("button", { name: "Check all rows" }).click();
      const response = await previewResponse;
      expect(response.ok()).toBeTruthy();
      const preview = await response.json();
      expect(preview.checked_rows).toBe(rows);
      expect(preview.returned_rows).toBeLessThanOrEqual(200);
      expect(preview.rows.length).toBe(preview.returned_rows);
      const codeField = preview.profile.fields.find((field: { name: string }) => field.name === "code");
      expect(preview.rows[0][codeField.field_id]).toBe("000000000000");
      expect((await response.body()).byteLength).toBeLessThan(500_000);
      await expect(page.getByRole("button", { name: "Apply import" })).toBeEnabled();
      expect(await page.locator("tbody tr").count()).toBeLessThanOrEqual(200);
      await sample("check_all_rows", started);
      started = Date.now();
      await page.getByRole("button", { name: "Apply import" }).click();
      await expect(page.getByRole("heading", { name: "Dataset is ready" })).toBeVisible();
      await sample("apply_import", started);
      started = Date.now();
      await page.getByRole("link", { name: "Back to data" }).click();
      await page.getByRole("link", { name: "Create report", exact: true }).click();
      await page.getByRole("combobox", { name: "Prepared dataset", exact: true }).selectOption({ label: "Large exact sales" });
      await page.getByLabel("Report name").fill("Large report");
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.getByRole("button", { name: "Add measure" }).click();
      await page.getByLabel("Measure name").fill("Revenue");
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.getByRole("checkbox", { name: "category", exact: true }).check();
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.getByRole("button", { name: "Preview calculation" }).click();
      await expect(page.getByRole("cell", { name: "100.00", exact: true })).toHaveCount(10);
      await page.getByRole("button", { name: "Save report" }).click();
      await expect(page.getByRole("heading", { name: "Report is ready" })).toBeVisible();
      await sample("report_authoring", started);
      started = Date.now();
      await page.getByRole("link", { name: "Open report" }).click();
      await expect(page.getByRole("cell", { name: "100.00", exact: true })).toHaveCount(10);
      await sample("report_open", started);
      started = Date.now();
      await page.reload();
      await expect(page.getByRole("cell", { name: "100.00", exact: true })).toHaveCount(10);
      await sample("report_reload", started);
      expect(errors).toEqual([]);
    } finally {
      await unlink(fixturePath);
      await testInfo.attach("large-report-performance", { body: JSON.stringify({ rows, width, evidence }, null, 2), contentType: "application/json" });
      console.log(JSON.stringify({ rows, width, evidence }));
      const cleanup = await createRequest.newContext();
      try {
        expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
      } finally {
        await cleanup.dispose();
      }
    }
  });
}
