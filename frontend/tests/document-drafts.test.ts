import { afterEach, expect, it, vi } from "vitest";
import { isVolatileDraft, readDocumentDraft, removeDocumentDraft, resetDocumentDrafts, writeDocumentDraft } from "@/features/workspace/document-drafts";

afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });
it("prefers the latest failed write over stale storage and keeps scopes separate", () => {
  writeDocumentDraft("one", "old"); writeDocumentDraft("two", "other");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  expect(() => writeDocumentDraft("one", "new")).toThrow("quota");
  expect(readDocumentDraft("one")).toBe("new");
  expect(isVolatileDraft("one")).toBe(true);
  expect(readDocumentDraft("two")).toBe("other");
  expect(sessionStorage.getItem("one")).toBe("old");
});
it("survives read denial only when this document already knows the draft", () => {
  writeDocumentDraft("known", "request");
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
  expect(readDocumentDraft("known")).toBe("request");
  expect(isVolatileDraft("known")).toBe(true);
  expect(() => readDocumentDraft("unknown")).toThrow("denied");
});
it("retains a failed discard but never revives a confirmed save after failed cleanup", () => {
  writeDocumentDraft("pending", "exact request");
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("denied"); });
  expect(() => removeDocumentDraft("pending")).toThrow("denied");
  expect(readDocumentDraft("pending")).toBe("exact request");
  expect(() => removeDocumentDraft("pending", true)).toThrow("denied");
  expect(readDocumentDraft("pending")).toBeNull();
  // A real reload loses this guarantee when persistent cleanup was denied.
  resetDocumentDrafts();
  expect(readDocumentDraft("pending")).toBe("exact request");
});
it("releases confirmed removed data and rejects oversized strings before replacing recovery", () => {
  writeDocumentDraft("draft", "good");
  expect(() => writeDocumentDraft("draft", "x".repeat(1_000_001))).toThrow("Draft too large");
  expect(readDocumentDraft("draft")).toBe("good");
  removeDocumentDraft("draft");
  expect(readDocumentDraft("draft")).toBeNull();
});
it("preserves oversized workflow disk writes without keeping stale fallback after a failed newer write", () => {
  const large = "x".repeat(1_000_001);
  writeDocumentDraft("graph", large, true);
  expect(readDocumentDraft("graph")).toBe(large);
  writeDocumentDraft("graph", "small");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  expect(() => writeDocumentDraft("graph", large, true)).toThrow("quota");
  expect(readDocumentDraft("graph")).toBeNull();
  expect(isVolatileDraft("graph")).toBe(false);
});
