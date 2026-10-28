"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { formatCell, localeCookie, localeNames, locales, nodeNames, parseLocale, translate, type Locale, type Parameters } from "./locale";
import { localizeError } from "./localized-errors";

function createMessages(locale: Locale) {
  const t = (key: string, parameters?: Parameters) => translate(locale, key, parameters);
  return { locale, t, errorText: (error: unknown) => localizeError(locale, error),
    nodeName: (type: string, version?: number) => t(version === 2 && ["scalar_constant", "field_arithmetic", "field_sum", "field_scalar", "field_formula"].includes(type) ? `Exact ${nodeNames[type]}` : type === "calculated_column" && version === 2 ? "Exact Calculated Column" : type === "window" && version === 3 ? "Exact Window" : type === "pivot" && version === 2 ? "Exact Pivot" : nodeNames[type] ?? type),
    cell: (value: unknown, type?: string) => formatCell(locale, value, type) };
}
const I18nContext = createContext({ ...createMessages("ru"), setLocale: (locale: Locale) => { void locale; } });
export const useI18n = () => useContext(I18nContext);

export function I18nProvider({ children, initialLocale = "ru" }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [locale, updateLocale] = useState(initialLocale);
  const [storageError, setStorageError] = useState(false);
  const setLocale = useCallback((value: Locale) => {
    const next = parseLocale(value);
    updateLocale(next);
    try {
      document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
      setStorageError(!document.cookie.split("; ").includes(`${localeCookie}=${next}`));
    } catch { setStorageError(true); }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.querySelector('meta[name="description"]')?.setAttribute("content", translate(locale, "Visual analytics · no code required"));
  }, [locale]);
  const value = useMemo(() => ({ ...createMessages(locale), setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>
    {children}
    {storageError ? <p role="alert" className="bg-danger-surface px-4 py-2 text-sm text-danger">{value.t("Language preference could not be saved.")}</p> : null}
  </I18nContext.Provider>;
}

export function LanguageSwitcher() {
  const { locale, t, setLocale } = useI18n();
  return <div className="flex items-center gap-2">
    <label htmlFor="interface-language">{t("Language")}</label>
    <select id="interface-language" value={locale} onChange={event => setLocale(parseLocale(event.target.value))}
      className="rounded border border-outline bg-control px-2 py-1">
      {locales.map(value => <option key={value} value={value} lang={value}>{localeNames[value]}</option>)}
    </select>
  </div>;
}
