export const themes = ["dark", "light"] as const;
export type Theme = typeof themes[number];
export const themeCookie = "nodebi-theme";
export function parseTheme(value: unknown): Theme {
  return value === "dark" ? "dark" : "light";
}
/** Canvas libraries need concrete colors; ordinary controls use the equivalent CSS tokens. */
export const themePalette = {
  dark: { accent: "#69cff7", panel: "#111d38", grid: "#354666", mask: "rgba(8, 15, 36, 0.75)" },
  light: { accent: "#0956bb", panel: "#fff", grid: "#dee2e6", mask: "rgba(248, 249, 250, 0.75)" },
} as const;
