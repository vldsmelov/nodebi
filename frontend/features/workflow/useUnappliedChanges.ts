"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

/** Confirmation is not persistence: keep the mounted draft when dismissal is declined. */
export function useUnappliedChanges(changed: boolean, close: () => void) {
  const { t } = useI18n();
  useEffect(() => {
    if (!changed) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changed]);
  return () => {
    if (!changed || window.confirm(t("Discard unapplied preparation changes?"))) close();
  };
}
