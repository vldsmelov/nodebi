import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { parseReleaseDraft, releaseDraftKey, useReleaseDraft } from "@/features/report-cycle/useReleaseDraft";
import { resetDocumentDrafts } from "@/features/workspace/document-drafts";

afterEach(() => { cleanup(); vi.restoreAllMocks(); sessionStorage.clear(); resetDocumentDrafts(); });
const settings = { name: "October", period: "2026-10", comment: "Reviewed", dashboardIds: ["board"], datePeriod: { start: "2026-10-01", end: "2026-10-31" }, contexts: { board: { amount: "9007199254740993.01", active: true, missing: null } } };
const raw = JSON.stringify({ version: 1, projectId: "project", settings });

describe("release settings recovery", () => {
  it("recovers partial date edits separately from the applied range", () => {
    const first = renderHook(() => useReleaseDraft("project"));
    act(() => first.result.current.change("datePeriod", settings.datePeriod));
    act(() => first.result.current.change("dateScratch", { start: "2026-11-01", end: "" }));
    first.unmount(); resetDocumentDrafts();
    const second = renderHook(() => useReleaseDraft("project"));
    act(() => second.result.current.restore());
    expect(second.result.current.settings.datePeriod).toEqual(settings.datePeriod);
    expect(second.result.current.settings.dateScratch).toEqual({ start: "2026-11-01", end: "" });
  });
  it("restores exact settings only after an explicit choice, without consent or check tokens", () => {
    sessionStorage.setItem(releaseDraftKey("project"), raw);
    const hook = renderHook(() => useReleaseDraft("project"));
    expect(hook.result.current.pending).toEqual(settings);
    expect(hook.result.current.settings.name).toBe("");
    act(() => hook.result.current.restore());
    expect(hook.result.current.settings).toEqual(settings);
    expect(hook.result.current.pending).toBeNull();
    expect(hook.result.current.dirty).toBe(true);
  });
  it("writes each edit, survives a new document and isolates projects", () => {
    const first = renderHook(() => useReleaseDraft("project"));
    act(() => first.result.current.change("name", "Monthly"));
    act(() => first.result.current.change("contexts", settings.contexts));
    first.unmount(); resetDocumentDrafts();
    const second = renderHook(() => useReleaseDraft("project"));
    expect(second.result.current.pending).toMatchObject({ name: "Monthly", contexts: settings.contexts });
    expect(renderHook(() => useReleaseDraft("other")).result.current.pending).toBeNull();
  });
  it("keeps the latest same-document draft if storage writes fail and does not discard it on failed removal", () => {
    const hook = renderHook(() => useReleaseDraft("project"));
    act(() => hook.result.current.change("name", "Old"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota"); });
    act(() => hook.result.current.change("name", "Latest"));
    expect(hook.result.current.storageError).toBe(true);
    expect(hook.result.current.volatile).toBe(true);
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("Denied"); });
    act(() => hook.result.current.discard());
    expect(hook.result.current.settings.name).toBe("Latest");
    hook.unmount();
    expect(renderHook(() => useReleaseDraft("project")).result.current.pending?.name).toBe("Latest");
  });
  it("does not overwrite an unreadable draft until explicit continuation", () => {
    sessionStorage.setItem(releaseDraftKey("project"), "broken");
    const hook = renderHook(() => useReleaseDraft("project"));
    expect(hook.result.current.unreadable).toBe(true);
    expect(sessionStorage.getItem(releaseDraftKey("project"))).toBe("broken");
    act(() => hook.result.current.continueWithoutRecovery());
    act(() => hook.result.current.change("name", "New"));
    expect(hook.result.current.unreadable).toBe(false);
    expect(parseReleaseDraft(sessionStorage.getItem(releaseDraftKey("project"))!, "project").name).toBe("New");
  });
  it("handles denied reads and removes only the explicitly discarded project draft", () => {
    sessionStorage.setItem(releaseDraftKey("project"), raw);
    sessionStorage.setItem("unrelated", "keep");
    const hook = renderHook(() => useReleaseDraft("project"));
    act(() => hook.result.current.discard());
    expect(hook.result.current.pending).toBeNull();
    expect(sessionStorage.getItem("unrelated")).toBe("keep");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Denied"); });
    expect(renderHook(() => useReleaseDraft("other")).result.current.unreadable).toBe(true);
  });
  it.each([
    { version: 2, projectId: "project", settings },
    { version: 1, projectId: "foreign", settings },
    { version: 1, projectId: "project", settings: { ...settings, dashboardIds: [3] } },
    { version: 1, projectId: "project", settings: { ...settings, datePeriod: undefined } },
    { version: 1, projectId: "project", settings: { ...settings, dateScratch: { start: 1, end: "" } } },
    { version: 1, projectId: "project", settings: { ...settings, dateScratch: { start: "2026-10-01" } } },
    { version: 1, projectId: "project", settings: { ...settings, contexts: { board: { nested: {} } } } },
    { version: 1, projectId: "project", settings: { ...settings, datePeriod: { start: "2026-02-30", end: "2026-03-01" } } },
  ])("rejects malformed or incompatible settings %#", value => {
    expect(() => parseReleaseDraft(JSON.stringify(value), "project")).toThrow();
  });
});
