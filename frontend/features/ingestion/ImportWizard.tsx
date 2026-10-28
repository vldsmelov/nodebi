"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataStatePanel, TableDensity, WizardHeading, WizardSteps } from "@/components/ui/workspace";
import { useI18n } from "@/lib/i18n";
import { applyImportDraft, inspectImport, previewImport, readOptions, saveImportDraft, uploadImport, type ImportDraft, type ImportSession, type ReadOptions, type ImportField, type ImportPreview, type ImportProfile, type ImportedSource } from "./api";
import { useDirtyGuard } from "@/features/report-cycle/useDirtyGuard";
import { ImportIssues, type ImportCorrection } from "./ImportIssues";

const steps = ["Source", "Acquisition", "Tables", "Fields", "Check and apply"];
const types: ImportField["logical_type"][] = ["string", "integer", "float", "decimal", "boolean", "date", "datetime"];

export function ImportWizard({ projectId, initialSession, onUploaded, onReload }: {
  projectId: string; initialSession?: ImportSession; onUploaded?: (source: ImportedSource) => void; onReload?: () => void;
}) {
  const { t, cell, errorText } = useI18n();
  const rangeHelpId = useId();
  const client = useQueryClient();
  const [step, setStep] = useState(initialSession ? initialSession.draft.profile ? 3 : 2 : 0);
  const [connector, setConnector] = useState(initialSession?.source.connector ?? "excel");
  const [file, setFile] = useState<File | null>(null);
  const [options, setOptions] = useState(initialSession?.draft.options ?? readOptions);
  const [source, setSource] = useState<ImportedSource | null>(initialSession?.source ?? null);
  const [resource, setResource] = useState(initialSession?.draft.resource_id ?? "");
  const [profile, setProfile] = useState<ImportProfile | null>(initialSession?.draft.profile ?? null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [draft, setDraft] = useState<ImportDraft | null>(initialSession?.draft ?? null);
  const [density, setDensity] = useState<"normal" | "compact">("normal");
  const [error, setError] = useState<Error | null>(null);
  const fieldEditors = useRef(new Map<string, HTMLFieldSetElement>());
  const pendingCorrection = useRef<ImportCorrection | null>(null);
  useEffect(() => {
    const correction = pendingCorrection.current;
    if (step !== 3 || !correction) return;
    pendingCorrection.current = null;
    const field = fieldEditors.current.get(correction.fieldId);
    if (correction.control === "key") {
      const details = field?.querySelector("details");
      if (details) details.open = true;
    }
    field?.querySelector<HTMLElement>(`[data-import-control="${correction.control}"]`)?.focus();
  }, [step]);
  const feedback = { onMutate: () => setError(null), onError: (failure: Error) => setError(failure) };
  const upload = useMutation({ ...feedback, mutationFn: async () => {
    if (!file) throw new Error("Choose a file.");
    return uploadImport(projectId, connector, file, options);
  }, onSuccess: result => { setSource(result); setResource(result.resources[0]?.id ?? ""); void client.invalidateQueries({ queryKey: ["imports", projectId] }); if (onUploaded) onUploaded(result); else setStep(2); } });
  async function persist(nextProfile = profile, nextResource = resource, nextOptions: ReadOptions = options) {
    const saved = await saveImportDraft(projectId, source!.id, { expected_revision: draft?.revision ?? 0, source_revision: source!.revision, resource_id: nextResource, options: nextOptions, profile: nextProfile });
    setDraft(saved); void client.invalidateQueries({ queryKey: ["imports", projectId] }); return saved;
  }
  const save = useMutation({ ...feedback, mutationFn: () => persist() });
  const inspect = useMutation({ ...feedback, mutationFn: async () => {
    const result = profile ? await previewImport(source!.id, profile) : await inspectImport(source!.id, resource, options);
    await persist(result.profile); return result;
  }, onSuccess: result => { setPreview(result); setProfile(result.profile); setStep(3); } });
  const check = useMutation({ ...feedback, mutationFn: async () => { const saved = await persist(); return previewImport(source!.id, saved.profile!); }, onSuccess: result => { setPreview(result); setStep(4); } });
  const apply = useMutation({ ...feedback, mutationFn: () => applyImportDraft(source!, draft!), onSuccess: () => { void client.invalidateQueries({ queryKey: ["datasets", projectId] }); void client.invalidateQueries({ queryKey: ["imports", projectId] }); } });
  const restart = useMutation({ ...feedback, mutationFn: () => persist(null, source!.resources[0].id, source!.read_options ?? readOptions), onSuccess: saved => { setResource(saved.resource_id); setOptions(saved.options ?? readOptions); setProfile(null); setPreview(null); setStep(2); } });
  const awaitingContinuation = step === 1 && !!source && !!onUploaded;
  const busy = awaitingContinuation || upload.isPending || inspect.isPending || check.isPending || apply.isPending || save.isPending || restart.isPending;
  const completed = !!apply.data || draft?.status === "applied";
  const reportDatasetId = apply.data?.id ?? source?.active_snapshots[resource] ?? draft?.snapshot_id;
  const stale = !!source && !!draft && draft.source_revision !== source.revision && !completed;
  const content = JSON.stringify({ resource, options, profile });
  const savedContent = JSON.stringify({ resource: draft?.resource_id ?? source?.resources[0]?.id ?? "", options: draft?.options ?? source?.read_options ?? readOptions, profile: draft?.profile ?? null });
  const dirty = !!source && !completed && content !== savedContent;
  useDirtyGuard(dirty || busy);
  function updateProfile(next: ImportProfile) { setProfile(next); setPreview(null); setError(null); check.reset(); apply.reset(); save.reset(); }
  function updateField(index: number, change: Partial<ImportField>) {
    updateProfile({ ...profile!, fields: profile!.fields.map((field, i) => i === index ? { ...field, ...change } : field) });
  }
  if (completed) return <section className="space-y-4 rounded-xl border border-outline bg-panel p-6">
    <WizardHeading stage="complete" className="text-xl font-semibold">{t("Dataset is ready")}</WizardHeading><p>{apply.data?.profile.name ?? draft?.profile?.name}{apply.data && ` · ${t("Rows: {0}", { 0: cell(apply.data.row_count) })}`}</p>
    <p className="text-muted">{t("The original file and the normalized dataset are saved separately.")}</p>
    <div className="flex flex-wrap gap-3"><Link className="af-btn" href={`/projects/${projectId}/build${reportDatasetId ? `?dataset=${encodeURIComponent(reportDatasetId)}` : ""}`}>{t("Create a report from this dataset")}</Link><Link className="af-btn af-btn--secondary" href={`/projects/${projectId}/data`}>{t("Back to data")}</Link></div>
  </section>;
  return <div className="space-y-6">
    <WizardSteps labels={steps} current={step} />
    {error && <DataStatePanel state="error" title="Import action failed" focusOnMount>{errorText(error)}</DataStatePanel>}
    {source && <div className="flex flex-wrap items-center gap-3 text-sm"><p role="status">{t(dirty ? "Unsaved import settings" : draft?.revision ? "Import draft saved" : "Original file saved; field settings are not applied")}</p>
      <Button variant="outline" disabled={busy || stale} onClick={() => save.mutate()}>{t("Save import draft")}</Button>
      {onReload && <Button variant="outline" disabled={busy} onClick={onReload}>{t("Reload saved import")}</Button>}
      <Link className="underline" href={`/projects/${projectId}/data`}>{t("Back to data")}</Link>
    </div>}
    {stale && <DataStatePanel state="previous"><p>{t("The source changed since this draft. Restart mapping with the current file.")}</p><Button disabled={busy} onClick={() => { if (window.confirm(t("Discard unsaved changes?"))) restart.mutate(); }}>{t("Restart mapping")}</Button></DataStatePanel>}
    <fieldset disabled={busy || stale} className="min-w-0 rounded-xl border border-outline bg-panel p-5">
      <legend className="px-2 text-lg font-semibold"><WizardHeading stage={step}>{t(steps[step])}</WizardHeading></legend>
      {step === 0 && <div className="grid gap-4 sm:grid-cols-3">
        {["excel", "csv"].map(type => <label key={type} className="flex cursor-pointer items-center gap-3 rounded-lg border border-outline p-5"><input type="radio" name="connector" value={type} checked={connector === type} onChange={() => { setConnector(type); setFile(null); }} />{type.toUpperCase()}</label>)}
        <div className="rounded-lg border border-dashed border-outline p-5 text-muted">{t("1C integration is planned")}</div>
      </div>}
      {step === 1 && <div className="grid max-w-2xl gap-4">
        <label>{t("File")}<input className="form-control mt-1" type="file" accept={connector === "excel" ? ".xlsx,.xlsm" : ".csv,.tsv"} onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>
        {connector === "csv" && <>
          <label>{t("Encoding")}<select className="form-control" value={options.encoding} onChange={e => setOptions({ ...options, encoding: e.target.value as typeof options.encoding })}><option value="utf-8-sig">UTF-8</option><option value="cp1251">Windows-1251</option><option value="utf-16">UTF-16</option></select></label>
          <label>{t("Delimiter")}<select className="form-control" value={options.delimiter} onChange={e => setOptions({ ...options, delimiter: e.target.value as typeof options.delimiter })}>{[",", ";", "\t", "|"].map(value => <option key={value} value={value}>{value === "\t" ? t("Tab character") : value}</option>)}</select></label>
        </>}
        <label>{t("Header row")}<input className="form-control" type="number" min={1} max={250000} value={options.header_row} onChange={e => setOptions({ ...options, header_row: Number(e.target.value) })} /></label>
        <p className="text-sm text-muted">{t("File upload saves an original copy. Applying creates a separate dataset.")}</p>
      </div>}
      {step === 2 && <div className="grid max-w-2xl gap-4">
        <label>{t("Table")}<select className="form-control" value={resource} onChange={e => { setResource(e.target.value); setProfile(null); setPreview(null); }}>{source?.resources.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>{t("Header row")}<input className="form-control" type="number" min={1} max={250000} disabled={!!options.cell_range} value={options.header_row} onChange={e => { setOptions({ ...options, header_row: Number(e.target.value) }); setProfile(null); setPreview(null); }} /></label>
        {connector === "excel" && <div><label>{t("Excel cell range (optional)")}<input className="form-control" aria-describedby={rangeHelpId} placeholder="B2:F100" maxLength={20} value={options.cell_range ?? ""} onChange={e => { setOptions({ ...options, cell_range: e.target.value || null }); setProfile(null); setPreview(null); }} /></label><p id={rangeHelpId} className="mt-1 text-sm text-muted">{t("The range starts with the header. Leave empty to read the whole sheet using the header row setting.")}</p></div>}
        {connector === "csv" && <>
          <label>{t("Encoding")}<select className="form-control" value={options.encoding} onChange={e => { setOptions({ ...options, encoding: e.target.value as ReadOptions["encoding"] }); setProfile(null); setPreview(null); }}>{["utf-8-sig", "cp1251", "utf-16"].map(value => <option key={value}>{value}</option>)}</select></label>
          <label>{t("Delimiter")}<select className="form-control" value={options.delimiter} onChange={e => { setOptions({ ...options, delimiter: e.target.value as ReadOptions["delimiter"] }); setProfile(null); setPreview(null); }}>{[",", ";", "\t", "|"].map(value => <option key={value} value={value}>{value === "\t" ? t("Tab character") : value}</option>)}</select></label>
        </>}
        <p className="text-muted">{t("Choose a table to inspect its fields. Each table becomes a separate dataset.")}</p>
        <details className="rounded-lg border border-outline p-4">
          <summary className="cursor-pointer font-medium">{t("Additional reading settings")}</summary>
          <div className="mt-4 grid gap-4">
            {connector === "excel" && <label>{t("Number of header rows")}<input className="form-control" type="number" min={1} max={10} step={1} value={options.header_rows ?? 1} onChange={e => { setOptions({ ...options, header_rows: Number(e.target.value) }); setProfile(null); setPreview(null); }} /></label>}
            <label>{t("Skip rows after headers")}<input className="form-control" type="number" min={0} max={250000} step={1} value={options.skip_data_rows ?? 0} onChange={e => { setOptions({ ...options, skip_data_rows: Number(e.target.value) }); setProfile(null); setPreview(null); }} /></label>
            <label>{t("Exclude rows at the end")}<input className="form-control" type="number" min={0} max={250000} step={1} value={options.drop_tail_rows ?? 0} onChange={e => { setOptions({ ...options, drop_tail_rows: Number(e.target.value) }); setProfile(null); setPreview(null); }} /></label>
            <p className="text-sm text-muted">{t("Excluded rows do not enter the dataset. The original file stays unchanged.")}</p>
          </div>
        </details>
      </div>}
      {step === 3 && profile && <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2"><label>{t("Dataset name")}<input className="form-control" value={profile.name} onChange={e => updateProfile({ ...profile, name: e.target.value })} /></label>
          <label>{t("What does one row represent?")}<input className="form-control" value={profile.grain ?? ""} onChange={e => updateProfile({ ...profile, grain: e.target.value })} /></label></div>
        <p className="text-sm text-muted">{t("Codes with leading zeros stay text. Conversion errors block import unless you explicitly allow nulls.")}</p>
        <p className="text-sm text-muted">{t("Optional row key: choose fields in Field details. Their combined values must be unique and nonempty; duplicates are not removed.")}</p>
        <div className="grid gap-3">{profile.fields.map((field, index) => <fieldset key={field.field_id} ref={element => { if (element) fieldEditors.current.set(field.field_id, element); else fieldEditors.current.delete(field.field_id); }} className="min-w-0 rounded-lg border border-outline p-4">
          <legend className="sr-only">{t("Field: {0}", { 0: field.name || String(index + 1) })}</legend>
          <div className="grid gap-3 md:grid-cols-[minmax(10rem,1fr)_10rem_auto]">
          <label>{t("Field name")}<input className="form-control" value={field.name} onChange={e => updateField(index, { name: e.target.value })} /></label>
          <label>{t("Data type")}<select data-import-control="type" className="form-control" value={field.logical_type} onChange={e => updateField(index, { logical_type: e.target.value as ImportField["logical_type"], timezone: null })}>{types.map(type => <option key={type} value={type}>{t(type)}</option>)}</select></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={field.nullable ?? true} onChange={e => updateField(index, { nullable: e.target.checked, error_policy: "reject" })} />{t("Allow empty values")}</label>
          <details className="md:col-span-3"><summary className="cursor-pointer py-2 text-sm text-accent">{t("Field details")}</summary><div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2"><input data-import-control="key" type="checkbox" checked={profile.key_fields?.includes(field.field_id) ?? false} disabled={!profile.key_fields?.includes(field.field_id) && (profile.key_fields?.length ?? 0) >= 32}
              onChange={e => updateProfile({ ...profile, key_fields: e.target.checked ? [...(profile.key_fields ?? []), field.field_id] : (profile.key_fields ?? []).filter(id => id !== field.field_id) })} />{t("Part of row key")}</label>
            <label>{t("Unit")}<input className="form-control" value={field.unit ?? ""} onChange={e => updateField(index, { unit: e.target.value || null })} /></label>
            <label>{t("Currency code")}<input className="form-control" maxLength={3} value={field.currency ?? ""} onChange={e => updateField(index, { currency: e.target.value.toUpperCase() || null })} /></label>
            <label>{t("Conversion errors")}<select className="form-control" value={field.error_policy ?? "reject"} onChange={e => updateField(index, { error_policy: e.target.value as ImportField["error_policy"] })}><option value="reject">{t("Stop and correct")}</option><option value="null" disabled={!field.nullable}>{t("Replace with empty value")}</option></select></label>
            {field.logical_type === "decimal" && <><label>{t("Precision")}<input className="form-control" type="number" min={1} max={38} value={field.precision} onChange={e => updateField(index, { precision: Number(e.target.value) })} /></label><label>{t("Decimal places")}<input className="form-control" type="number" min={0} max={38} value={field.scale} onChange={e => updateField(index, { scale: Number(e.target.value) })} /></label></>}
            {["decimal", "float", "integer"].includes(field.logical_type) && <label>{t("Decimal separator")}<select className="form-control" value={field.decimal_separator ?? "."} onChange={e => updateField(index, { decimal_separator: e.target.value as "." | "," })}><option>.</option><option>,</option></select></label>}
            {field.logical_type === "datetime" && <label>{t("Time zone")}<input className="form-control" placeholder="Europe/Moscow" value={field.timezone ?? ""} onChange={e => updateField(index, { timezone: e.target.value || null })} /></label>}
            {["date", "datetime"].includes(field.logical_type) && <label>{t("Date format")}<select className="form-control" value={field.date_format ?? "iso"} onChange={e => updateField(index, { date_format: e.target.value as ImportField["date_format"] })}>{["iso", "%d.%m.%Y", "%d/%m/%Y", "%m/%d/%Y"].map(format => <option key={format}>{format}</option>)}</select></label>}
          </div></details>
        </div></fieldset>)}</div>
      </div>}
      {step === 4 && preview && <div className="space-y-3">
        <p>{t("Checked all {0} rows; showing {1}.", { 0: cell(preview.checked_rows), 1: cell(preview.returned_rows) })}</p>
        <p>{preview.can_apply ? t("Data is ready to apply.") : t("Correct the highlighted fields before applying.")}</p>
        {!!preview.issue_count && profile && <ImportIssues preview={preview} profile={profile} onReview={target => { pendingCorrection.current = target; setStep(3); setError(null); }} />}
      </div>}
    </fieldset>
    {preview && <section tabIndex={0} aria-label={t("Data preview")} className="min-w-0 overflow-auto rounded-xl border border-outline bg-panel p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{t("Data preview")}</h2><TableDensity value={density} onChange={setDensity} /></div>
      <table className="data-table" data-density={density}><caption className="sr-only">{t("Data preview")}</caption><thead><tr>{preview.profile.fields.map(field => <th scope="col" key={field.field_id} data-numeric={["decimal", "float", "integer"].includes(field.logical_type)}>{field.name}</th>)}</tr></thead><tbody>{preview.rows.map((row, index) => <tr key={index}>{preview.profile.fields.map(field => <td key={field.field_id} data-numeric={["decimal", "float", "integer"].includes(field.logical_type)}>{cell(row[field.field_id], field.logical_type)}</td>)}</tr>)}</tbody></table>
    </section>}
    <fieldset disabled={busy || stale} className="flex flex-wrap items-center gap-3">
      {step > (source ? 2 : 0) && <Button variant="outline" disabled={busy} onClick={() => { setStep(step - 1); setError(null); upload.reset(); inspect.reset(); check.reset(); apply.reset(); }}>{t("Back")}</Button>}
      {step === 0 && <Button onClick={() => setStep(1)}>{t("Next")}</Button>}
      {step === 1 && <Button disabled={!file || busy} onClick={() => upload.mutate()}>{t("Upload and continue")}</Button>}
      {step === 2 && <Button disabled={!resource || busy} onClick={() => inspect.mutate()}>{t("Inspect fields")}</Button>}
      {step === 3 && <Button disabled={busy || !profile?.name.trim()} onClick={() => check.mutate()}>{t("Check all rows")}</Button>}
      {step === 4 && <Button disabled={busy || dirty || !draft?.profile || !preview?.can_apply} onClick={() => apply.mutate()}>{t("Apply import")}</Button>}
      {busy && <span role="status" className="text-sm text-muted">{t("Processing data…")}</span>}
    </fieldset>
  </div>;
}
