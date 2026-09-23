import type { Page } from "@playwright/test";

/** Reveal advanced operations through the same disclosure available to authors. */
export async function showAllOperations(page: Page) {
  const summary = page.getByText("All operations", { exact: true });
  if (await summary.count() && await summary.locator("..").getAttribute("open") === null) await summary.click();
}
