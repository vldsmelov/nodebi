import { ApiError, apiRequest } from "@/lib/api";
import type { Job, Update } from "./api";

export async function readInputUpdate(projectId: string, updateId: string): Promise<Update> {
  const rows = await apiRequest<Update[]>(`/api/v1/projects/${projectId}/updates`);
  const row = rows.find(item => item.id === updateId);
  if (!row) throw new Error("This update is unavailable in this project. Choose a saved update from history.");
  return row;
}

/** The server still owns every check and CAS; this only removes manual navigation. */
export function assertInputRevision(row: Update, revision: number) {
  if (row.revision !== revision) throw new ApiError("The report changed. Reload before applying your draft.", 409, "REPORT_CONFLICT");
}

export async function checkInputUpdate(row: Update, signal?: AbortSignal): Promise<Update> {
  const job = await apiRequest<Job>(`/api/v1/updates/${row.id}/check`, {
    method: "POST", body: JSON.stringify({ expected_revision: row.revision }), signal,
  });
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    signal?.throwIfAborted();
    const jobs = await apiRequest<Job[]>(`/api/v1/projects/${row.project_id}/report-jobs`, { signal });
    const current = jobs.find(item => item.id === job.id);
    if (current?.status === "succeeded") {
      const checked = await readInputUpdate(row.project_id, row.id);
      assertInputRevision(checked, row.revision + 1);
      if (checked.status !== "checked" || !checked.check || current.result_id !== row.id || current.check?.token !== checked.check.token) {
        throw new ApiError("The report changed. Reload before applying your draft.", 409, "REPORT_CONFLICT");
      }
      signal?.throwIfAborted();
      return checked;
    }
    if (current && ["failed", "cancelled", "interrupted"].includes(current.status)) {
      throw new Error(current.message || "Data update failed");
    }
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  throw new Error("Checks are still running. Your changes are saved. Reopen this update to continue.");
}

export async function applyInputUpdate(row: Update, acknowledge = false): Promise<Update> {
  try {
    return await apiRequest<Update>(`/api/v1/updates/${row.id}/apply`, {
      method: "POST", body: JSON.stringify({ expected_revision: row.revision, acknowledge_warnings: acknowledge }),
    });
  } catch (failure) {
    // A successful server commit can outlive a dropped response, including legacy Excel.
    const saved = await readInputUpdate(row.project_id, row.id).catch(() => null);
    if (saved?.status === "applied" && saved.revision === row.revision + 1) return saved;
    throw failure;
  }
}
