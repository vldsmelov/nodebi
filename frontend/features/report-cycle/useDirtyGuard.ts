"use client";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

export function useDirtyGuard(dirty: boolean) {
  const { t } = useI18n();
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest("a[href]");
      const href = link?.getAttribute("href");
      if (dirty && href && !href.startsWith("#") && !window.confirm(t("Discard unsaved changes?"))) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty, t]);
}
