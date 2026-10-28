import { afterEach, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "@/lib/api";
import { applyInputUpdate, assertInputRevision, checkInputUpdate } from "@/features/report-cycle/save-input-update";
import type { Update } from "@/features/report-cycle/api";

vi.mock("@/lib/api", async original => ({ ...await original<typeof import("@/lib/api")>(), apiRequest: vi.fn() }));
const row: Update = { id: "update", project_id: "project", revision: 4, status: "draft", name: "Correction", browser_editor_pending: false, items: [], check: null, created_at: "2026-10-26" };
afterEach(() => vi.resetAllMocks());

it("rejects another tab's newer checked draft rather than applying it automatically", async () => {
  vi.mocked(apiRequest).mockResolvedValueOnce({ id: "job" }).mockResolvedValueOnce([{ id: "job", status: "succeeded", result_id: row.id, check: { token: "current" } }]).mockResolvedValueOnce([{ ...row, revision: 6, status: "checked", check: { token: "current", issues: [] } }]);
  await expect(checkInputUpdate(row)).rejects.toMatchObject({ code: "REPORT_CONFLICT" });
  expect(vi.mocked(apiRequest).mock.calls.some(([url]) => url.endsWith("/apply"))).toBe(false);
});
it("returns only the exact revision produced by the completed job", async () => {
  const checked = { ...row, revision: 5, status: "checked", check: { token: "current", issues: [] } };
  vi.mocked(apiRequest).mockResolvedValueOnce({ id: "job" }).mockResolvedValueOnce([{ id: "job", status: "succeeded", result_id: row.id, check: { token: "current" } }]).mockResolvedValueOnce([checked]);
  await expect(checkInputUpdate(row)).resolves.toEqual(checked);
});
it("recognizes an exact completed apply after its HTTP response was lost without resubmitting", async () => {
  const applied = { ...row, revision: 5, status: "applied" };
  vi.mocked(apiRequest).mockRejectedValueOnce(new TypeError("Connection lost")).mockResolvedValueOnce([applied]);
  await expect(applyInputUpdate(row)).resolves.toEqual(applied);
  expect(vi.mocked(apiRequest).mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
});
it("does not treat a different revision or cancelled draft as a completed save", async () => {
  const failure = new ApiError("Conflict", 409, "REPORT_CONFLICT");
  vi.mocked(apiRequest).mockRejectedValueOnce(failure).mockResolvedValueOnce([{ ...row, revision: 6, status: "applied" }]);
  await expect(applyInputUpdate(row)).rejects.toBe(failure);
  expect(() => assertInputRevision(row, 3)).toThrow(ApiError);
});
it("does not proceed to an apply after the editing session is aborted", async () => {
  const controller = new AbortController(); controller.abort();
  await expect(checkInputUpdate(row, controller.signal)).rejects.toBeDefined();
  expect(vi.mocked(apiRequest).mock.calls.some(([url]) => url.endsWith("/apply"))).toBe(false);
});
