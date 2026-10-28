import { expect, test, request as createRequest } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { expectDialogFits } from "./form-reflow";

const api = process.env.NODEBI_E2E_API ?? "http://127.0.0.1:8000";
for (const multikey of [false, true]) test(`two books, ${multikey ? "composite" : "single"} Join, calculated field and shared dashboard visualizations`, async ({ page, request }) => {
  test.setTimeout(150000);
  const keep = process.env.NODEBI_KEEP_TABLE_DEMO === "1" || (multikey && process.env.NODEBI_KEEP_MULTIKEY_DEMO === "1");
  const prefix = multikey ? "multikey" : "join";
  const project = await (await request.post(`${api}/api/v1/projects`, { data: { name: "Table authoring acceptance" } })).json();
  try {
    for (const name of [`${prefix}-orders`, `${prefix}-prices`]) {
      const upload = await request.post(`${api}/api/v1/projects/${project.id}/sources/excel`, { multipart: { file: { name: `${name}.xlsx`, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: readFileSync(resolve(`../fixtures/excel/${name}.xlsx`)) } } });
      expect(upload.ok()).toBeTruthy();
    }
    await page.goto(`/projects/${project.id}/workflow`);
    await page.getByRole("button", { name: "New field workflow", exact: true }).click();
    await expect(page.getByRole("region", { name: "Next step", exact: true })).toBeVisible();
    await expect(page.getByTitle("Add Field arithmetic · v1", { exact: true })).toBeHidden();
    const saved = async () => { await expect(page.getByText("Saved", { exact: true })).toBeVisible(); await expect(page.getByText("Updating fields", { exact: true })).toHaveCount(0); };
    for (const name of [`${prefix}-orders.xlsx`, `${prefix}-prices.xlsx`]) {
      const book = page.getByRole("region", { name: "Workbook browser" }).locator("article").filter({ hasText: name });
      await book.getByRole("button", { name: new RegExp(name) }).click();
      await book.getByTitle("Add sheet to graph", { exact: true }).click(); await saved();
    }
    await page.locator(".react-flow__node").filter({ hasText: "Orders" }).first().click();
    await page.getByRole("button", { name: "Join with…", exact: true }).click();
    const step = page.getByRole("dialog");
    const retainDraft = async () => {
      const originalSize = page.viewportSize()!;
      for (const enlarged of [false, true]) {
        await page.setViewportSize({ width: enlarged ? 1000 : 420, height: 800 });
        await page.evaluate(value => { document.documentElement.style.fontSize = value ? "32px" : "16px"; }, enlarged);
        await expect.poll(() => step.evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth + 1)).toBe(true);
        await expectDialogFits(page, step);
        const cancel = step.getByRole("button", { name: "Cancel", exact: true });
        await step.locator("input, select, button").first().focus();
        for (let count = 0; count < 80 && !await cancel.evaluate(button => button === document.activeElement); count++) await page.keyboard.press("Tab");
        await expect(cancel).toBeFocused();
        await expect.poll(() => cancel.evaluate(button => {
          const bounds = button.getBoundingClientRect();
          const dialog = button.closest("dialog")!.getBoundingClientRect();
          return bounds.left >= dialog.left && bounds.right <= dialog.right && bounds.top >= dialog.top && bounds.bottom <= dialog.bottom;
        })).toBe(true);
        const preserve = page.waitForEvent("dialog").then(async confirmation => {
          expect(confirmation.type()).toBe("confirm");
          expect(confirmation.message()).toBe("Discard unapplied preparation changes?");
          await confirmation.dismiss();
        });
        await Promise.all([preserve, page.keyboard.press("Enter")]);
        await expect(step).toBeVisible();
      }
      await page.evaluate(() => { document.documentElement.style.removeProperty("font-size"); });
      await page.setViewportSize(originalSize);
      for (const action of [() => page.keyboard.press("Escape"), () => step.getByRole("button", { name: "Cancel", exact: true }).click()]) {
        const confirmation = page.waitForEvent("dialog").then(async dialog => {
          expect(dialog.type()).toBe("confirm");
          expect(dialog.message()).toBe("Discard unapplied preparation changes?");
          await dialog.dismiss();
        });
        await Promise.all([confirmation, action()]);
        await expect(step).toBeVisible();
      }
    };
    await step.getByLabel("Right table", { exact: true }).selectOption({ label: `${prefix}-prices.xlsx / Prices` });
    await step.getByLabel("Left key", { exact: true }).selectOption({ label: "Product" });
    await step.getByLabel("Right key", { exact: true }).selectOption({ label: "Product" });
    if (multikey) {
      await step.getByRole("button", { name: "Add key pair", exact: true }).click();
      await step.getByLabel("Left key 2", { exact: true }).selectOption({ label: "Month" });
      await step.getByLabel("Right key 2", { exact: true }).selectOption({ label: "Month" });
      await step.getByLabel("Expected relationship", { exact: true }).selectOption("many_to_one");
    }
    await expect(step).toHaveAccessibleName("Join with…");
    await retainDraft();
    await expect(step.getByLabel("Left key", { exact: true })).not.toHaveValue("");
    await step.getByRole("button", { name: "Add step", exact: true }).click(); await saved();
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    const report = page.getByRole("region", { name: "Join report", exact: true });
    await expect(report).toBeVisible();
    await expect(report).toContainText("Inner join excluded");
    await page.getByLabel("Join records", { exact: true }).selectOption("left_unmatched");
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.locator("table")).toContainText("C");
    await page.getByLabel("Join records", { exact: true }).selectOption("");
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(report).toBeVisible();
    const previewWidth = (await page.getByRole("region", { name: "Data preview", exact: true }).boundingBox())!.width;
    expect(previewWidth).toBeGreaterThan(900);
    await page.getByRole("button", { name: "Add calculated field", exact: true }).click();
    await step.getByText("Build a condition", { exact: true }).click();
    await step.getByLabel("When true", { exact: true }).fill("Unapplied condition");
    await retainDraft();
    await expect(step.getByLabel("When true", { exact: true })).toHaveValue("Unapplied condition");
    await step.getByLabel("When true", { exact: true }).fill("");
    await step.getByText("Build a condition", { exact: true }).click();
    await step.getByLabel("Output field name", { exact: true }).fill("Revenue");
    await step.getByLabel("Left operand", { exact: true }).selectOption({ label: "Quantity" });
    await step.getByLabel("Right operand", { exact: true }).selectOption({ label: "Price" });
    await expect(step).toHaveAccessibleName("Add calculated field");
    await retainDraft();
    await expect(step.getByLabel("Output field name", { exact: true })).toHaveValue("Revenue");
    await step.getByText("Build a condition", { exact: true }).click();
    await step.getByLabel("When true", { exact: true }).fill("Unapplied result");
    await step.getByText("Build a condition", { exact: true }).click();
    await expect(step.getByRole("status")).toContainText("Condition changes are not in the formula yet.");
    const beforeSaveUrl = `${api}/api/v1/workflows/${new URL(page.url()).searchParams.get("workflow")}`;
    for (const accept of [false, true]) {
      const confirmation = page.waitForEvent("dialog").then(async dialog => {
        expect(dialog.message()).toBe("The condition has unapplied changes. Save the current calculation without them?");
        if (accept) await dialog.accept(); else await dialog.dismiss();
      });
      await Promise.all([confirmation, step.getByRole("button", { name: "Add step", exact: true }).click()]);
      if (!accept) {
        await expect(step).toBeVisible();
        expect((await (await request.get(beforeSaveUrl)).json()).nodes).toHaveLength(3);
      }
    }
    await saved();
    const workflowId = new URL(page.url()).searchParams.get("workflow");
    const path = `${api}/api/v1/workflows/${workflowId}`;
    expect((await (await request.get(path)).json()).nodes).toHaveLength(4);
    await page.getByRole("button", { name: "Undo", exact: true }).click(); await saved();
    expect((await (await request.get(path)).json()).nodes).toHaveLength(3);
    await page.getByRole("button", { name: "Redo", exact: true }).click(); await saved();
    await page.locator(".react-flow__node-fieldNode").filter({ hasText: "Revenue" }).first().click();
    const calculation = (await (await request.get(path)).json()).nodes.find((node: {type: string}) => node.type === "calculated_column");
    await page.getByRole("button", { name: "Edit calculation", exact: true }).click();
    await expect(step.getByLabel("Left operand", { exact: true })).toHaveValue(calculation.config.expression.match(/\[([^\]]+)\]/)[1]);
    await step.getByLabel("Operation", { exact: true }).selectOption("+");
    await step.getByRole("button", { name: "Save calculation", exact: true }).click(); await saved();
    const edited = await (await request.get(path)).json();
    expect(edited.nodes.find((node: {type: string}) => node.type === "calculated_column").id).toBe(calculation.id);
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.locator("table")).toContainText("12"); await expect(page.locator("table")).toContainText("23");
    await page.getByRole("button", { name: "Edit calculation", exact: true }).click();
    await step.getByLabel("Operation", { exact: true }).selectOption("*");
    await step.getByRole("button", { name: "Save calculation", exact: true }).click(); await saved();
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.locator("table")).toContainText("20"); await expect(page.locator("table")).toContainText("60");
    await page.getByRole("button", { name: "Summarize data", exact: true }).click();
    await step.getByRole("button", { name: "Add aggregation", exact: true }).click();
    await step.getByLabel("Aggregate field 1", { exact: true }).selectOption({ label: "Revenue" });
    await step.getByLabel("Aggregation 1", { exact: true }).selectOption("sum");
    await step.getByLabel("Aggregate name 1", { exact: true }).fill("Total");
    await retainDraft();
    await expect(step.getByLabel("Aggregate name 1", { exact: true })).toHaveValue("Total");
    await step.getByRole("button", { name: "Add step", exact: true }).click(); await saved();
    await page.getByRole("button", { name: "Preview output", exact: true }).click();
    await expect(page.locator("table")).toContainText("80");
    await page.getByRole("button", { name: "Undo", exact: true }).click(); await saved();
    await page.locator(".react-flow__node-fieldNode").filter({ hasText: "Revenue" }).first().click();
    await page.getByRole("button", { name: "Publish this output", exact: true }).click();
    await step.getByLabel("Result name", { exact: true }).fill("Revenue rows");
    const publicationSize = page.viewportSize()!;
    for (const enlarged of [false, true]) {
      await page.setViewportSize({ width: enlarged ? 1280 : 420, height: 800 });
      await page.evaluate(value => { document.documentElement.style.fontSize = value ? "32px" : "16px"; }, enlarged);
      await expectDialogFits(page, step);
      await expect(step.getByLabel("Result name", { exact: true })).toHaveValue("Revenue rows");
      await step.getByLabel("Result name", { exact: true }).focus();
      await page.keyboard.press("Tab");
      await expect(step.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(step.getByRole("button", { name: "Publish result", exact: true })).toBeFocused();
      await page.screenshot({ path: test.info().outputPath(`publication-${enlarged ? "large-text" : "narrow"}.png`) });
    }
    await page.evaluate(() => { document.documentElement.style.removeProperty("font-size"); });
    await page.setViewportSize(publicationSize);
    await step.getByRole("button", { name: "Publish result", exact: true }).click(); await saved();
    const card = page.locator(".react-flow__node-resultNode");
    await expect(card).toHaveCount(1);
    const cardBox = await card.boundingBox();
    await page.mouse.move(cardBox!.x + 100, cardBox!.y + 15);
    await page.mouse.down(); await page.mouse.move(cardBox!.x + 170, cardBox!.y + 65, { steps: 8 }); await page.mouse.up(); await saved();
    const positioned = await (await request.get(path)).json();
    expect(positioned.presentation.results).toHaveLength(1);
    expect(positioned.nodes).toHaveLength(4); expect(positioned.edges).toHaveLength(3);
    for (const type of ["bar_chart", "table"]) {
      await card.getByRole("button", { name: "Create visualization", exact: true }).click();
      const visual = page.getByRole("dialog", { name: "Independent visualization", exact: true });
      await visual.getByLabel("Visualization name", { exact: true }).fill(type === "table" ? "Revenue table" : "Revenue chart");
      await visual.getByLabel("Visualization type", { exact: true }).selectOption(type);
      if (type === "bar_chart") {
        await visual.getByLabel("Chart category", { exact: true }).selectOption({ label: multikey ? "Month" : "Product" });
        await visual.getByLabel("Chart value", { exact: true }).selectOption({ label: "Revenue" });
      }
      await visual.getByRole("button", { name: "Save visualization", exact: true }).click();
      await expect(visual).toHaveCount(0);
    }
    const before = await (await request.get(path)).json();
    await page.reload(); await expect(page.locator(".react-flow__node-resultNode")).toHaveCount(1);
    expect(await (await request.get(path)).json()).toEqual(before);
    await page.getByText("Published results and filters", { exact: true }).click();
    await page.getByText("Revenue rows", { exact: true }).click();
    await page.getByRole("button", { name: "Remove publication", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Revenue chart" })).toBeVisible();
    expect(await (await request.get(path)).json()).toEqual(before);
    await page.goto(`/projects/${project.id}/dashboard`);
    await page.getByRole("button", { name: "Create dashboard", exact: true }).click();
    for (const name of ["Revenue chart", "Revenue table"]) {
      await page.getByRole("button", { name: "Add chart", exact: true }).click();
      await page.getByText(new RegExp(`^${name}`)).first().locator("..").getByRole("button", { name: "Add widget", exact: true }).click();
    }
    await page.getByRole("button", { name: "Save dashboard", exact: true }).click(); await saved();
    await page.reload(); await expect(page.locator("[data-widget-id]")).toHaveCount(2);
    expect(await (await request.get(path)).json()).toEqual(before);
    await page.getByRole("button", { name: "View dashboard", exact: true }).click();
    await expect(page.locator("[data-widget-id] table")).toContainText("60");
    await page.screenshot({ path: test.info().outputPath("dashboard.png"), fullPage: true });
    if (keep) writeFileSync(resolve(multikey ? "../.backups/multikey-demo.json" : "../.backups/table-authoring-demo.json"), JSON.stringify({ projectId: project.id, workflowId, graph: before, url: page.url() }));
  } finally {
    if (!keep) {
      const cleanup = await createRequest.newContext();
      expect((await cleanup.delete(`${api}/api/v1/projects/${project.id}?confirm=true`)).ok()).toBeTruthy();
      await cleanup.dispose();
    }
  }
});
