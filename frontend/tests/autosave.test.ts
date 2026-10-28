import { afterEach, describe, expect, it, vi } from "vitest";
import { browserWorkflowStorage, WorkflowAutosave, type GraphDraft } from "@/features/workflow/autosave";
import type { Workflow } from "@/features/workflow/types";

const draft = (name: string): GraphDraft => ({ format_version: 1, name, nodes: [], edges: [] });
const saved = (revision: number) => ({ revision }) as Workflow;
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); sessionStorage.clear(); });

describe("workflow autosave", () => {
  it("recovers the newest denied-storage graph on remount with its original revision and retires a saved draft", async () => {
    const first = new WorkflowAutosave("w", 4, draft("initial"), vi.fn(), vi.fn(), browserWorkflowStorage);
    first.change(draft("disk copy"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    first.change(draft("newest")); first.dispose();
    const notify = vi.fn();
    const persist = vi.fn().mockResolvedValue(saved(6));
    const reopened = new WorkflowAutosave("w", 5, draft("other tab"), persist, notify, browserWorkflowStorage);
    expect(reopened.recover()).toEqual({ draft: draft("newest"), conflict: true });
    expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({ error: expect.stringContaining("temporary draft") }));
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("denied"); });
    await reopened.flush();
    expect(persist).toHaveBeenCalledExactlyOnceWith({ ...draft("newest"), expected_revision: 4 });
    reopened.dispose();
    const again = new WorkflowAutosave("w", 6, draft("newest"), vi.fn(), vi.fn(), browserWorkflowStorage);
    expect(again.recover()).toBeNull();
    again.dispose();
  });
  it("keeps server autosave working when obtaining sessionStorage itself throws", async () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => { throw new DOMException("Denied", "SecurityError"); });
    const notify = vi.fn();
    const persist = vi.fn().mockResolvedValue(saved(2));
    const writer = new WorkflowAutosave("w", 1, draft("initial"), persist, notify, browserWorkflowStorage);
    expect(writer.recover()).toBeNull();
    expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({ status: "error", error: "The local draft could not be restored." }));
    writer.change(draft("server saved"));
    expect(writer.discard()).toBe(false);
    expect(writer.dirty).toBe(true);
    expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({ error: "The local draft could not be removed. Nothing was discarded." }));
    await writer.flush();
    expect(persist).toHaveBeenCalledExactlyOnceWith({ ...draft("server saved"), expected_revision: 1 });
    expect(writer.dirty).toBe(false);
    expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({ status: "saved", error: "Local recovery storage is unavailable. Keep this page open until saved." }));
    writer.dispose();
  });
  it("confirmed discard cannot reintroduce a pending draft during disposal", async () => {
    vi.useFakeTimers();
    const persist = vi.fn();
    const writer = new WorkflowAutosave("w", 1, draft("initial"), persist, vi.fn(), sessionStorage);
    writer.change(draft("discarded"));
    expect(writer.discard()).toBe(true);
    writer.dispose();
    await vi.advanceTimersByTimeAsync(1000);
    expect(persist).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(writer.key)).toBeNull();
  });
  it("isolates unsaved typed wires from the classic editor recovery key", () => {
    vi.useFakeTimers();
    const typed: GraphDraft = { ...draft("typed"), format_version: 2, edges: [{ id: "edge", source_node_id: "a", source_port: "dataset", source_column_id: "stable-field", target_node_id: "b", target_port: "value" }] };
    const field = new WorkflowAutosave("w", 1, { ...typed, edges: [] }, vi.fn(), vi.fn(), sessionStorage, "fields-v2");
    field.change(typed); field.dispose();
    const classic = new WorkflowAutosave("w", 1, draft("initial"), vi.fn(), vi.fn(), sessionStorage);
    expect(classic.recover()).toBeNull();
    classic.change(draft("classic edit")); classic.dispose();
    const restored = new WorkflowAutosave("w", 1, typed, vi.fn(), vi.fn(), sessionStorage, "fields-v2");
    expect(restored.recover()?.draft).toEqual(typed);
    restored.dispose();
    expect(JSON.parse(sessionStorage.getItem(classic.key)!).draft.name).toBe("classic edit");
  });
  it("coalesces edits and persists the pending draft before debounce", async () => {
    vi.useFakeTimers();
    const persist = vi.fn().mockResolvedValue(saved(2));
    const writer = new WorkflowAutosave("w", 1, draft("initial"), persist, vi.fn(), sessionStorage);
    writer.change(draft("first")); writer.change(draft("last"));
    expect(JSON.parse(sessionStorage.getItem(writer.key)!).draft.name).toBe("last");
    await vi.advanceTimersByTimeAsync(600);
    expect(persist).toHaveBeenCalledExactlyOnceWith({ ...draft("last"), expected_revision: 1 });
    expect(sessionStorage.getItem(writer.key)).toBeNull();
  });

  it("serializes slow saves and uses each acknowledged revision", async () => {
    let finish!: (value: Workflow) => void;
    const persist = vi.fn().mockImplementationOnce(() => new Promise<Workflow>((resolve) => { finish = resolve; })).mockResolvedValue(saved(3));
    const writer = new WorkflowAutosave("w", 1, draft("initial"), persist, vi.fn(), sessionStorage);
    writer.change(draft("first")); const running = writer.flush();
    writer.change(draft("second"));
    expect(persist).toHaveBeenCalledTimes(1);
    finish(saved(2)); await running;
    expect(persist.mock.calls[1][0]).toEqual({ ...draft("second"), expected_revision: 2 });
    expect(writer.dirty).toBe(false);
    writer.dispose();
  });

  it("retains a failed draft and retries without overwriting a conflict", async () => {
    const notify = vi.fn();
    const persist = vi.fn().mockRejectedValueOnce(new Error("Workflow conflict")).mockResolvedValue(saved(2));
    const writer = new WorkflowAutosave("w", 1, draft("initial"), persist, notify, sessionStorage);
    writer.change(draft("edit")); await writer.flush();
    expect(writer.dirty).toBe(true);
    expect(notify).toHaveBeenLastCalledWith(expect.objectContaining({ status: "error" }));
    await writer.flush();
    expect(persist.mock.calls[1][0].expected_revision).toBe(1);
    expect(writer.dirty).toBe(false);
  });

  it("restores a draft after navigation before debounce and detects a stale base", () => {
    const persist = vi.fn();
    const writer = new WorkflowAutosave("w", 1, draft("initial"), persist, vi.fn(), sessionStorage);
    writer.change(draft("unsaved")); writer.dispose();
    const reopened = new WorkflowAutosave("w", 2, draft("other tab"), persist, vi.fn(), sessionStorage);
    expect(reopened.recover()).toEqual({ draft: draft("unsaved"), conflict: true });
    expect(persist).not.toHaveBeenCalled();
    reopened.dispose();
  });
});
