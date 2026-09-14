import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";
import { cookies } from "next/headers";
import { localeCookie, parseLocale, translate } from "@/lib/locale";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const locale = parseLocale((await cookies()).get(localeCookie)?.value);
  return { title: "Node BI", description: translate(locale, "Visual analytics · no code required") };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = parseLocale((await cookies()).get(localeCookie)?.value);
  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
