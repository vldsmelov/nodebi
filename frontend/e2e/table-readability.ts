import { expect, type Locator, type Page } from "@playwright/test";

/** Check rendered table geometry, not Tailwind class names. */
export async function expectReadableTable(page: Page, numericHeader: Locator, numericCell: Locator) {
  const table = page.getByRole("table");
  await expect(table).toHaveCSS("font-size", "14px");
  await expect(numericHeader).toHaveCSS("text-align", "right");
  await expect(numericCell).toHaveCSS("text-align", "right");
  await expect(numericCell).toHaveCSS("font-variant-numeric", "tabular-nums");
  await expect.poll(() => table.evaluate(element => {
    const scroll = element.parentElement!;
    const widget = element.closest("[data-widget-id]")!;
    const box = scroll.getBoundingClientRect(), card = widget.getBoundingClientRect();
    return box.width > 0 && box.left >= card.left - 1 && box.right <= card.right + 1
      && getComputedStyle(scroll).overflowX === "auto";
  })).toBe(true);
  // Overflow must remain reachable, including the final column.
  await table.evaluate(element => { element.parentElement!.scrollLeft = element.parentElement!.scrollWidth; });
  await expect.poll(() => table.evaluate(element => {
    const scroll = element.parentElement!;
    return scroll.scrollWidth - scroll.clientWidth - scroll.scrollLeft <= 1;
  })).toBe(true);
}
