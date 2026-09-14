"use client";

import { useI18n } from "@/lib/i18n";

export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  return <main className="grid min-h-[calc(100vh-2.75rem)] place-items-center bg-page p-6 text-foreground">
    <div role="alert" className="text-center"><h1 className="text-2xl">{t("The operation could not be completed. Try again.")}</h1>
      {error.digest ? <p className="mt-4 text-sm">{t("Diagnostic ID: {0}", { 0: error.digest })}</p> : null}
      <button onClick={reset} className="mt-5 text-accent">{t("Try again")}</button>
    </div>
  </main>;
}
