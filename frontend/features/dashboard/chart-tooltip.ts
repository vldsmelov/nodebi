import type { TooltipComponentOption } from "echarts";

/** Source-derived chart content is plain text, never trusted HTML. */
export function plainTextTooltip(text: string) {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  return `<div role="tooltip" style="white-space:pre-wrap">${escaped}</div>`;
}

/** Body-level text escapes short canvases; width follows the current chart. */
export function boundedPlainTextTooltip(): TooltipComponentOption {
  return {
    trigger: "item", renderMode: "html", appendToBody: true, confine: true,
    extraCssText: "max-width: min(420px, calc(100vw - 24px)); box-sizing: border-box; overflow-wrap: anywhere;",
    position: (point, _params, element, _rect, size) => {
      // ECharts confines the box using its remeasured size after text wrapping.
      if (element instanceof HTMLElement) element.style.maxWidth = `${Math.min(420, size.viewSize[0])}px`;
      return [point[0] + 12, point[1] + 12];
    },
    formatter: (event: unknown) => plainTextTooltip((event as { data?: { exactTooltip?: string } }).data?.exactTooltip ?? ""),
  };
}
