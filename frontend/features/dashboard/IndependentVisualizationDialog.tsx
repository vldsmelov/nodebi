"use client";
import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { VisualizationEditor, type EditorHandle, type VisualizationEditorProps } from "./VisualizationEditor";

export function IndependentVisualizationDialog(props: VisualizationEditorProps) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null), editor = useRef<EditorHandle>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} aria-label={t("Independent visualization")} onCancel={event => { event.preventDefault(); editor.current?.leave(props.close); }} className="m-auto max-h-[90vh] w-[min(740px,94vw)] overflow-auto rounded-xl border border-outline bg-panel p-6 text-foreground backdrop:bg-black/60">
    <VisualizationEditor {...props} editorRef={editor} />
  </dialog>;
}
