import type { Page } from "@playwright/test";

/** Legacy journeys intentionally exercise v1; never silently select the newer exact operator. */
export function legacyOperationTitle(name: string): string {
  return ["Calculated Column", "Group By", "Field arithmetic", "Field expression", "Sum field", "Single value", "Constant", "Pivot", "Window"].includes(name) ? `${name} · v1` : name;
}

/** Reveal advanced operations through the same disclosure available to authors. */
export async function showAllOperations(page: Page) {
  const summary = page.getByText("All operations", { exact: true });
  if (await summary.count() && await summary.locator("..").getAttribute("open") === null) await summary.click();
}
