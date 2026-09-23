"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

export function PublishResultDialog({ initialName, close, publish }: { initialName: string; close: () => void; publish: (name: string) => void }) {
  const { t } = useI18n(); const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(initialName.slice(0, 200));
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog aria-label={t("Publish this output")} ref={dialog} onCancel={close} className="w-[440px] max-w-[95vw] rounded-xl border border-outline bg-panel p-6 text-main">
    <h2>{t("Publish this output")}</h2>
    <label className="mt-4 block">{t("Result name")}<input autoFocus aria-label={t("Result name")} maxLength={200} className="my-2 w-full rounded border border-outline bg-control p-2" value={name} onChange={e => setName(e.target.value)} /></label>
    <p className="text-sm text-muted">{t("Several visualizations can use this result. Calculations stay in the graph.")}</p>
    <div className="mt-4 flex gap-4"><button onClick={close}>{t("Cancel")}</button><button disabled={!name.trim()} onClick={() => publish(name.trim())}>{t("Publish result")}</button></div>
  </dialog>;
}
