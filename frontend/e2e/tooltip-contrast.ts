import { expect, test, type Locator } from "@playwright/test";
import { contrastSamples } from "./computed-contrast";

/** Measure settled rendered HTML text, including inherited colour/background composition. */
export async function expectTooltipContrast(tooltip: Locator) {
  await expect(tooltip).toBeVisible();
  await expect.poll(() => tooltip.evaluate(element => {
    for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
      if (Number(getComputedStyle(ancestor).opacity) !== 1) return false;
    }
    return true;
  })).toBe(true);
  // A body-level translucent popup overlays canvas pixels, not its DOM ancestor's paint.
  // Refuse that unsupported case instead of reporting a misleading ancestry-only ratio.
  const background = await tooltip.evaluate(element => getComputedStyle(element.parentElement!).backgroundColor);
  expect(background).toMatch(/^rgb\([\d.,\s]+\)$/);
  const samples = await contrastSamples(tooltip);
  expect(samples.length).toBeGreaterThan(0);
  for (const sample of samples) expect(sample.ratio, sample.text).toBeGreaterThanOrEqual(sample.minimum);
  await test.info().attach(`tooltip-contrast-${test.info().attachments.length}`, {
    body: JSON.stringify(samples, null, 2), contentType: "application/json",
  });
}
