"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { I18nProvider, LanguageSwitcher } from "@/lib/i18n";
import type { Locale } from "@/lib/locale";

export function Providers({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  const [queryClient] = useState(() => new QueryClient());
  return <I18nProvider initialLocale={locale}><LanguageSwitcher /><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></I18nProvider>;
}
