"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { parseTheme, themeCookie, themePalette, type Theme } from "./theme";
import { useI18n } from "./i18n";

const ThemeContext = createContext({ theme: "light" as Theme, palette: themePalette.light as typeof themePalette[Theme], setTheme: (theme: Theme) => { void theme; } });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children, initialTheme = "light" }: { children: React.ReactNode; initialTheme?: Theme }) {
  const [theme, updateTheme] = useState(initialTheme);
  const [storageError, setStorageError] = useState(false);
  const { t } = useI18n();
  const setTheme = useCallback((value: Theme) => {
    const next = parseTheme(value);
    updateTheme(next);
    try {
      document.cookie = `${themeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
      setStorageError(!document.cookie.split("; ").includes(`${themeCookie}=${next}`));
    } catch { setStorageError(true); }
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const value = useMemo(() => ({ theme, palette: themePalette[theme], setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>
    {storageError ? <p role="alert" className="bg-danger-surface p-3 text-danger">{t("Theme preference could not be saved.")}</p> : null}
    {children}
  </ThemeContext.Provider>;
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  return <div className="flex items-center gap-2">
    <label htmlFor="interface-theme">{t("Theme")}</label>
    <select id="interface-theme" value={theme} onChange={event => setTheme(parseTheme(event.target.value))}
      className="rounded border border-outline bg-control px-2 py-1">
      <option value="dark">{t("Dark")}</option>
      <option value="light">{t("Light")}</option>
    </select>
  </div>;
}
