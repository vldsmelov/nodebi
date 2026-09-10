import type { components } from "@/lib/api-schema";
import { apiRequest } from "@/lib/api";
export type WorksheetInfo = components["schemas"]["WorksheetInfoRead"];
export type DataSource = components["schemas"]["DataSourceRead"];
export type ColumnInfo = components["schemas"]["ColumnInfoRead"];
export type WorksheetPreview = components["schemas"]["WorksheetPreviewRead"];

export async function listSources(projectId: string): Promise<DataSource[]> {
  const result = await apiRequest<{ items: DataSource[] }>(`/api/v1/projects/${projectId}/sources`);
  return result.items;
}
export function uploadSource(projectId: string, file: File) {
  const body = new FormData(); body.append("file", file);
  return apiRequest<DataSource>(`/api/v1/projects/${projectId}/sources/excel`, { method: "POST", body });
}
export function previewSheet(sourceId: string, sheetName: string) {
  return apiRequest<WorksheetPreview>(`/api/v1/sources/${sourceId}/sheets/${encodeURIComponent(sheetName)}/preview`);
}
export function deleteSource(sourceId: string) {
  return apiRequest<void>(`/api/v1/sources/${sourceId}`, { method: "DELETE" });
}
