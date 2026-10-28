import { expect, type Page } from "@playwright/test";

export function spreadsheetDriver(page: Page) {
  const address = page.getByRole("textbox", { name: "Cell address", exact: true });
  const value = page.getByLabel("Selected cell value or formula", { exact: true });
  const grid = async () => {
    await expect(page.locator(".sheet-grid-frame")).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
    const canvases = page.locator("canvas:visible");
    for (const canvas of await canvases.all()) {
      const box = await canvas.boundingBox();
      if (box && box.height > 100) return canvas;
    }
    throw new Error("The worksheet canvas is not ready");
  };
  const focus = async () => (await grid()).evaluate(canvas => { canvas.tabIndex = 0; canvas.focus(); });
  return { address, value, grid, focus,
    go: async (cell: string, expected?: string) => {
      await expect(address).toBeEnabled({ timeout: 30_000 }); await address.fill(cell); await address.press("Enter");
      if (expected !== undefined) await expect(value).toHaveText(expected);
    },
    enter: async (text: string) => { await focus(); await page.keyboard.press("F2"); await page.keyboard.press("Control+a"); await page.keyboard.insertText(text); },
  };
}
