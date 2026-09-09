export type WorksheetInfo = { name: string; row_count: number | null; column_count: number | null };
export type DataSource = {
  id: string;
  project_id: string;
  name: string;
  original_filename: string;
  file_size: number;
  status: string;
  workbook: { sheets: WorksheetInfo[] };
};
export type ColumnInfo = {
  column_id: string;
  display_name: string;
  engine_name: string;
  logical_type: string;
  nullable: boolean;
};
export type WorksheetPreview = {
  sheet_name: string;
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  returned_rows: number;
  truncated: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function response<T>(request: Promise<Response>): Promise<T> {
  const result = await request;
  if (!result.ok) {
    const body = await result.json().catch(() => null);
    throw new Error(body?.detail?.message ?? "The request could not be completed.");
  }
  return result.status === 204 ? (undefined as T) : result.json();
}

export async function listSources(projectId: string): Promise<DataSource[]> {
  const result = await response<{ items: DataSource[] }>(
    fetch(`${API_URL}/api/v1/projects/${projectId}/sources`),
  );
  return result.items;
}

export function uploadSource(projectId: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return response<DataSource>(
    fetch(`${API_URL}/api/v1/projects/${projectId}/sources/excel`, { method: "POST", body }),
  );
}

export function previewSheet(sourceId: string, sheetName: string) {
  return response<WorksheetPreview>(
    fetch(
      `${API_URL}/api/v1/sources/${sourceId}/sheets/${encodeURIComponent(sheetName)}/preview`,
    ),
  );
}

export function deleteSource(sourceId: string) {
  return response<void>(
    fetch(`${API_URL}/api/v1/sources/${sourceId}`, { method: "DELETE" }),
  );
}

