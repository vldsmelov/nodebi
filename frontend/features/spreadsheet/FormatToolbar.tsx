"use client";

import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, WrapText } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { FormatPatch } from "./session";

export default function FormatToolbar({ current, disabled, reason, apply }: { current: FormatPatch; disabled: boolean; reason?: string; apply: (patch: FormatPatch) => void }) {
  const { t } = useI18n();
  const sizes = [...new Set([8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72, current.size ?? 11])].sort((a, b) => a - b);
  const controls = [
    { name: "Bold", Icon: Bold, active: !!current.bold, patch: { bold: !current.bold } },
    { name: "Italic", Icon: Italic, active: !!current.italic, patch: { italic: !current.italic } },
    { name: "Wrap text", Icon: WrapText, active: !!current.wrap, patch: { wrap: !current.wrap } },
    { name: "Align left", Icon: AlignLeft, active: current.alignment === "left", patch: { alignment: "left" as const } },
    { name: "Align center", Icon: AlignCenter, active: current.alignment === "center", patch: { alignment: "center" as const } },
    { name: "Align right", Icon: AlignRight, active: current.alignment === "right", patch: { alignment: "right" as const } },
  ];
  return <fieldset className="sheet-format-group" disabled={disabled} aria-label={t("Cell formatting")} aria-describedby={reason ? "sheet-format-help" : undefined}>
    <legend className="sr-only">{t("Cell formatting")}</legend>
    <div className="sheet-format-row">
      <label>{t("Font size")}<select aria-label={t("Font size")} value={current.size ?? 11} onChange={e => apply({ size: Number(e.target.value) })}>{sizes.map(size => <option key={size} value={size}>{size}</option>)}</select></label>
      <label title={t("Text color")}>{t("Text color")}<input type="color" aria-label={t("Text color")} value={current.color?.startsWith("#") ? current.color : "#18212c"} onChange={e => apply({ color: e.target.value })} /></label>
      <label title={t("Fill color")}>{t("Fill color")}<input type="color" aria-label={t("Fill color")} value={current.background?.startsWith("#") ? current.background : "#ffffff"} onChange={e => apply({ background: e.target.value })} /></label>
    </div>
    <div className="sheet-format-row">{controls.map(({ name, Icon, active, patch }) => <button key={name} type="button" title={t(name)} aria-label={t(name)} aria-pressed={active} onPointerDown={e => e.preventDefault()} onClick={() => apply(patch)}><Icon size={17} aria-hidden="true" /></button>)}<button type="button" onClick={() => apply({ background: "none" })}>{t("No fill")}</button><button type="button" onClick={() => apply({ color: "auto" })}>{t("Automatic text color")}</button></div>
    <p id="sheet-format-help" className="sheet-format-help" aria-hidden={!reason}>{reason ? t(reason) : "\u00a0"}</p>
  </fieldset>;
}
