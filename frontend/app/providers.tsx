"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { I18nProvider } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";
import { ThemeProvider } from "@/lib/theme-provider";
import type { Theme } from "@/lib/theme";
import { CorporateHeader } from "@/components/ui/CorporateHeader";
import { usePathname } from "next/navigation";

export function Providers({ children, locale, theme }: { children: React.ReactNode; locale: Locale; theme: Theme }) {
  const [queryClient] = useState(() => new QueryClient());
  const standalone = usePathname()?.startsWith("/spreadsheet/");
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("nodebi-source-updates");
    channel.onmessage = event => { if (event.data?.type === "source-applied") void queryClient.invalidateQueries(); };
    return () => channel.close();
  }, [queryClient]);
  return <I18nProvider initialLocale={locale}><ThemeProvider initialTheme={theme}>
    {!standalone && <CorporateHeader />}
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </ThemeProvider></I18nProvider>;
}
