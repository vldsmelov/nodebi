import type { Metadata } from "next";
import "./globals.css";
import "./corporate.css";
import { Providers } from "./providers";
import { cookies } from "next/headers";
import { localeCookie, parseLocale, translate } from "@/lib/locale";
import { parseTheme, themeCookie } from "@/lib/theme";

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(localeCookie)?.value);
  return { title: "Node BI · Алабуга", description: translate(locale, "Visual analytics · no code required") };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const preferences = await cookies();
  const locale = parseLocale(preferences.get(localeCookie)?.value);
  const theme = parseTheme(preferences.get(themeCookie)?.value);
  return (
    <html lang={locale} data-theme={theme}>
      <body className="af">
        <Providers locale={locale} theme={theme}>{children}</Providers>
      </body>
    </html>
  );
}
