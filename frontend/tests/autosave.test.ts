import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkflowAutosave, type GraphDraft } from "@/features/workflow/autosave";
import type { Workflow } from "@/features/workflow/types";

const draft = (name: string): GraphDraft => ({ name, nodes: [], edges: [] });
const saved = (revision: number) => ({ revision }) as Workflow;
afterEach(() => { vi.useRealTimers(); sessionStorage.clear(); });

describe("workflow autosave", () => {
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
