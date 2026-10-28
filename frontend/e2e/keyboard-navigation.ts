import { expect, type Locator, type Page } from "@playwright/test";

/** Reach controls through browser tab order; never repair focus programmatically. */
export async function tabTo(page: Page, target: Locator, reverse = false) {
  await expect(target).toHaveCount(1);
  await expect(target).toBeVisible();
  for (let index = 0; index < 160; index++) {
    if (await target.evaluate(element => element === document.activeElement)) {
      await expect(target).toBeFocused();
      return;
    }
    await page.keyboard.press(reverse ? "Shift+Tab" : "Tab");
  }
  throw new Error(`Control was not reached by ${reverse ? "Shift+Tab" : "Tab"}: ${await target.getAttribute("aria-label") ?? await target.textContent()}`);
}

export async function activateByKeyboard(page: Page, target: Locator) {
  await expect(target).toBeEnabled();
  await tabTo(page, target);
  await page.keyboard.press("Enter");
}

export async function typeByKeyboard(page: Page, target: Locator, value: string) {
  await tabTo(page, target);
  await page.keyboard.press("Control+A");
  await page.keyboard.type(value);
  await expect(target).toHaveValue(value);
}

export async function chooseByKeyboard(page: Page, target: Locator, choice: { value: string } | { label: string }) {
  await expect(target).toBeVisible();
  await expect.poll(() => target.locator("option").evaluateAll((elements, expected) => elements.some(element => {
    const option = element as HTMLOptionElement;
    return !option.disabled && ("value" in expected ? option.value === expected.value : option.label === expected.label);
  }), choice)).toBe(true);
  const options = await target.locator("option").evaluateAll(elements => elements.map(element => {
    const option = element as HTMLOptionElement;
    return { value: option.value, label: option.label, disabled: option.disabled };
  }).filter(option => !option.disabled));
  const index = options.findIndex(option => "value" in choice ? option.value === choice.value : option.label === choice.label);
  expect(index).toBeGreaterThanOrEqual(0);
  await tabTo(page, target);
  await page.keyboard.press("Space");
  await page.keyboard.press("Home");
  for (let position = 0; position < index; position++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(target).toHaveValue(options[index].value);
}
