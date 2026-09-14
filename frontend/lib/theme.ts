export const themes = ["dark", "light"] as const;
export type Theme = typeof themes[number];
export const themeCookie = "nodebi-theme";
export function parseTheme(value: unknown): Theme {
  return value === "light" ? "light" : "dark";
}
/** Canvas libraries need concrete colors; ordinary controls use the equivalent CSS tokens. */
export const themePalette = {
  dark: { accent: "#b7ff5a", grid: "#33402d", mask: "rgba(4, 7, 3, 0.75)" },
  light: { accent: "#35671c", grid: "#c8d2c0", mask: "rgba(239, 244, 234, 0.75)" },
} as const;
