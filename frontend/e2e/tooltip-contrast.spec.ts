import { test, expect } from "@playwright/test";
import { expectTooltipContrast } from "./tooltip-contrast";

test("tooltip contrast assertion accepts opaque readable text and rejects low contrast or unsupported overlays", async ({ page }) => {
  await page.setContent('<body style="background:white"><div style="background:white;color:black"><div role="tooltip">Exact value: 123.45</div></div></body>');
  const tooltip = page.getByRole("tooltip");
  await expectTooltipContrast(tooltip);
  await tooltip.evaluate(element => { (element as HTMLElement).style.color = "white"; });
  await expect(expectTooltipContrast(tooltip)).rejects.toThrow();
  await tooltip.evaluate(element => {
    (element as HTMLElement).style.color = "black";
    element.parentElement!.style.backgroundColor = "rgba(255,255,255,0.5)";
  });
  await expect(expectTooltipContrast(tooltip)).rejects.toThrow();
});
