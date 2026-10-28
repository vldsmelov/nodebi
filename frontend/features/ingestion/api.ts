import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";

export type ImportProfile = components["schemas"]["ImportProfile"];
export type ImportField = components["schemas"]["ImportField"];
export type ImportPreview = components["schemas"]["ImportPreview"];
export type ImportedSource = components["schemas"]["ImportedSourceRead"];
export type DatasetSnapshot = components["schemas"]["DatasetSnapshotRead"];
export type ReadOptions = components["schemas"]["ReadOptions"];
export type ImportDraft = components["schemas"]["ImportDraftRead"];
export type ImportSession = components["schemas"]["ImportSessionRead"];
export type SaveDraft = components["schemas"]["SaveImportDraft"];
export const readOptions: ReadOptions = { encoding: "utf-8-sig", delimiter: ",", header_row: 1, header_rows: 1, skip_data_rows: 0, drop_tail_rows: 0 };

export const listDatasets = (projectId: string) => apiRequest<DatasetSnapshot[]>(`/api/v1/projects/${projectId}/datasets`);
export const listImports = (projectId: string) => apiRequest<ImportedSource[]>(`/api/v1/projects/${projectId}/imports`);
export function uploadImport(projectId: string, connector: string, file: File, options: ReadOptions) {
  const body = new FormData();
  body.append("file", file); body.append("connector", connector);
  body.append("encoding", options.encoding ?? "utf-8-sig"); body.append("delimiter", options.delimiter ?? ",");
  body.append("header_row", String(options.header_row ?? 1));
  return apiRequest<ImportedSource>(`/api/v1/projects/${projectId}/imports`, { method: "POST", body });
}
export const inspectImport = (sourceId: string, resourceId: string, options: ReadOptions) => apiRequest<ImportPreview>(`/api/v1/imports/${sourceId}/inspect`, { method: "POST", body: JSON.stringify({ resource_id: resourceId, options }) });
export const previewImport = (sourceId: string, profile: ImportProfile) => apiRequest<ImportPreview>(`/api/v1/imports/${sourceId}/preview`, { method: "POST", body: JSON.stringify(profile) });
export const applyImport = (source: ImportedSource, profile: ImportProfile, requestId: string) => apiRequest<DatasetSnapshot>(`/api/v1/imports/${source.id}/apply`, { method: "POST", body: JSON.stringify({ profile, expected_revision: source.revision, request_id: requestId }) });
export const getImportSession = (projectId: string, sourceId: string) => apiRequest<ImportSession>(`/api/v1/projects/${projectId}/imports/${sourceId}/session`);
export const saveImportDraft = (projectId: string, sourceId: string, settings: SaveDraft) => apiRequest<ImportDraft>(`/api/v1/projects/${projectId}/imports/${sourceId}/draft`, { method: "PUT", body: JSON.stringify(settings) });
export const applyImportDraft = (source: ImportedSource, draft: ImportDraft) => apiRequest<DatasetSnapshot>(`/api/v1/imports/${source.id}/apply`, { method: "POST", body: JSON.stringify({ profile: draft.profile, expected_revision: draft.source_revision, request_id: draft.request_id, draft_revision: draft.revision }) });
