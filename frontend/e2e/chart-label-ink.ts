import { expect, type Page } from "@playwright/test";

type InkWindow = typeof globalThis & { chartLabelInk?: { text: string; alpha: number; color: string }[] };

/** Observe actual canvas paint; this does not infer rendering from chart options. */
export async function observeChartLabels(page: Page, texts: string[]) {
  await page.addInitScript(values => {
    const paint = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof paint>) {
      if (values.includes(args[0])) {
        const records = ((window as InkWindow).chartLabelInk ??= []);
        records.push({ text: args[0], alpha: this.globalAlpha, color: String(this.fillStyle) });
        if (records.length > 1000) records.splice(0, 500);
      }
      return paint.apply(this, args);
    };
  }, texts);
}

export async function expectOpaqueChartLabels(page: Page, texts: string[], theme: string) {
  await expect.poll(() => page.evaluate(values => values.map(text => ((window as InkWindow).chartLabelInk ?? []).findLast(record => record.text === text)), texts))
    .toEqual(texts.map(text => ({ text, alpha: 1, color: theme === "dark" ? "#d7dfef" : "#34415b" })));
}
