"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { I18nProvider, LanguageSwitcher } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";
import { ThemeProvider, ThemeSwitcher } from "@/lib/theme-provider";
import type { Theme } from "@/lib/theme";

export function Providers({ children, locale, theme }: { children: React.ReactNode; locale: Locale; theme: Theme }) {
  const [queryClient] = useState(() => new QueryClient());
  return <I18nProvider initialLocale={locale}><ThemeProvider initialTheme={theme}>
    <div className="flex h-11 items-center justify-end gap-4 border-b border-outline bg-panel px-3 text-sm text-foreground sm:px-6">
      <ThemeSwitcher /><LanguageSwitcher />
    </div>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </ThemeProvider></I18nProvider>;
}
