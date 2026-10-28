/** Small settings/request strings only; never datasets. Lives only in the current document.
 * Storage remains the reload recovery layer. A failed write must not expose an older disk draft
 * after a client-side route remount. Failures still propagate so the UI never claims durability.
 */
const drafts = new Map<string, { raw: string | null; volatile: boolean }>();
export const volatileDraftNotice = "A temporary draft is kept in this open page. Returning within the app can restore it; reloading or closing the tab can lose it.";

export function isVolatileDraft(key: string): boolean {
  const draft = drafts.get(key);
  return !!draft?.volatile && draft.raw !== null;
}

export function readDocumentDraft(key: string): string | null {
  const memory = drafts.get(key);
  if (memory?.volatile) return memory.raw;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw !== null && raw.length <= 1_000_000) drafts.set(key, { raw, volatile: false });
    else drafts.delete(key);
    return raw;
  } catch (error) {
    if (!memory) throw error;
    memory.volatile = true;
    return memory.raw;
  }
}

export function writeDocumentDraft(key: string, raw: string, storageOnlyIfOversized = false): void {
  if (raw.length > 1_000_000) {
    if (!storageOnlyIfOversized) throw new Error("Draft too large");
    // Large graph drafts retain their existing disk-storage behavior without unbounded memory.
    // If the new write fails, do not resurrect an older, smaller in-document/disk draft.
    drafts.set(key, { raw: null, volatile: true });
    sessionStorage.setItem(key, raw);
    drafts.delete(key);
    return;
  }
  const memory = { raw, volatile: true };
  drafts.set(key, memory);
  sessionStorage.setItem(key, raw);
  memory.volatile = false;
}

export function removeDocumentDraft(key: string, retired = false): void {
  try { sessionStorage.removeItem(key); drafts.delete(key); }
  catch (error) {
    // A confirmed server save or return to pristine settings can retire recovery locally.
    // A failed explicit discard retains both versions and blocks navigation as before.
    if (retired) drafts.set(key, { raw: null, volatile: true });
    throw error;
  }
}

/** Tests simulate a new browser document; real reload naturally destroys this module's memory. */
export function resetDocumentDrafts(): void { drafts.clear(); }
