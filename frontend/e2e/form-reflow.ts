import { expect, type Locator, type Page } from "@playwright/test";

export async function expectDialogFits(page: Page, dialog: Locator) {
  const controls = dialog.locator("input:visible, select:visible, textarea:visible, button:visible");
  expect(await controls.count()).toBeGreaterThan(0);
  for (const control of await controls.all()) {
    await control.scrollIntoViewIfNeeded();
    const bounds = (await control.boundingBox())!;
    const panel = (await dialog.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(Math.max(0, panel.x));
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(Math.min(page.viewportSize()!.width, panel.x + panel.width));
    expect(bounds.y).toBeGreaterThanOrEqual(Math.max(0, panel.y));
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(Math.min(page.viewportSize()!.height, panel.y + panel.height));
  }
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
}

export const formLayouts = ["desktop", "narrow", "large-text"] as const;
export async function configureFormLayout(page: Page, layout: typeof formLayouts[number]) {
  await page.setViewportSize({ width: layout === "narrow" ? 420 : layout === "large-text" ? 1280 : 1600, height: 1000 });
  if (layout === "large-text") await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => { document.documentElement.style.fontSize = "32px"; });
  });
}

/** Inspect real rendered controls, not just document overflow or element existence. */
export async function expectFormFits(page: Page, root: Locator = page.locator("main")) {
  const controls = root.locator("input:visible, select:visible, textarea:visible, button:visible");
  expect(await controls.count()).toBeGreaterThan(0);
  for (const control of await controls.all()) {
    await control.scrollIntoViewIfNeeded();
    const bounds = (await control.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
