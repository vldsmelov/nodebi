import type { Locator } from "@playwright/test";

export async function contrastSamples(root: Locator, focus = false) {
  return root.evaluate((root, focus) => {
    type Color = [number, number, number, number];
    const color = (value: string): Color => {
      const numbers = value.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
      if (/^rgba?\(/.test(value)) return [numbers[0] / 255, numbers[1] / 255, numbers[2] / 255, numbers[3] ?? 1];
      if (value.startsWith("color(srgb ")) return [numbers[0], numbers[1], numbers[2], numbers[3] ?? 1];
      const expression = `color(from ${value} srgb r g b / alpha)`;
      if (!CSS.supports("color", expression)) throw new Error(`Unsupported computed color: ${value}`);
      const probe = document.createElement("span");
      probe.style.color = expression;
      document.body.append(probe);
      const converted = getComputedStyle(probe).color;
      probe.remove();
      if (!converted.startsWith("color(srgb ")) throw new Error(`Unsupported converted color: ${converted}`);
      return color(converted);
    };
    const over = (front: Color, back: Color): Color => {
      const alpha = front[3] + back[3] * (1 - front[3]);
      return [...front.slice(0, 3).map((value, index) => alpha ? (value * front[3] + back[index] * back[3] * (1 - front[3])) / alpha : 0), alpha] as Color;
    };
    const background = (element: Element | null): Color => {
      if (!element) throw new Error("No opaque background for contrast measurement");
      const style = getComputedStyle(element);
      if (style.backgroundImage !== "none" || Number(style.opacity) !== 1 || style.filter !== "none" || style.mixBlendMode !== "normal") throw new Error(`Unsupported paint on ${element.tagName}`);
      const paint = color(style.backgroundColor);
      return paint[3] === 1 ? paint : over(paint, background(element.parentElement));
    };
    const luminance = (value: Color) => value.slice(0, 3).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const ratio = (a: Color, b: Color) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
    const elements = focus ? [root] : [root, ...root.querySelectorAll("*")].filter(element =>
      element.getClientRects().length && getComputedStyle(element).visibility === "visible" &&
      !element.closest(":disabled") && [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()));
    return elements.map(element => {
      for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
        const paint = getComputedStyle(ancestor);
        if (Number(paint.opacity) !== 1 || paint.filter !== "none" || paint.mixBlendMode !== "normal") throw new Error(`Unsupported compositing on ${ancestor.tagName}`);
      }
      const style = getComputedStyle(element);
      const back = background(focus ? element.parentElement : element);
      const front = over(color(focus ? style.outlineColor : style.color), back);
      const size = parseFloat(style.fontSize), weight = parseInt(style.fontWeight);
      return { text: element.textContent?.trim().slice(0, 100), ratio: ratio(front, back), minimum: focus || size >= 24 || size >= 18.6667 && weight >= 700 ? 3 : 4.5 };
    });
  }, focus);
}
