import type { Workflow, WorkflowSave } from "./types";

export type GraphDraft = Omit<WorkflowSave, "expected_revision">;
export type SaveState = { status: "saved" | "saving" | "error"; revision: number; error: string | Error | null };

/** One serialized writer per mounted workflow; drafts survive navigation/reload. */
export class WorkflowAutosave {
  private pending: GraphDraft | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | null = null;
  private revision: number;
  private acknowledged: string;
  private stopped = false;
  private storageError: string | null = null;
  private initialRevision: number;

  constructor(
    readonly id: string,
    revision: number,
    initial: GraphDraft,
    private readonly persist: (payload: WorkflowSave) => Promise<Workflow>,
    private readonly notify: (state: SaveState) => void,
    private readonly storage: Storage,
    private readonly namespace = "",
  ) {
    this.revision = revision;
    this.initialRevision = revision;
    this.acknowledged = JSON.stringify(initial);
  }

  get key() { return `nodebi:workflow-draft:${this.id}${this.namespace ? `:${this.namespace}` : ""}`; }
  get dirty() { return this.pending !== null || this.running !== null; }
  get savedGraph() { return this.acknowledged; }

  recover(): { draft: GraphDraft; conflict: boolean } | null {
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (!value.draft || !Array.isArray(value.draft.nodes) || !Array.isArray(value.draft.edges)) return null;
      this.pending = value.draft;
      this.revision = value.revision;
      const conflict = value.revision !== this.serverRevision;
      return { draft: value.draft, conflict };
    } catch {
      this.notify({ status: "error", revision: this.revision, error: "The local draft could not be restored." });
      return null;
    }
  }

  private get serverRevision() { return this.initialRevision; }
  resume() { this.stopped = false; }

  private remember() {
    try {
      if (this.pending) this.storage.setItem(this.key, JSON.stringify({ revision: this.revision, draft: this.pending }));
      else this.storage.removeItem(this.key);
      this.storageError = null;
    } catch {
      this.storageError = "Local recovery storage is unavailable. Keep this page open until saved.";
    }
  }

  change(draft: GraphDraft) {
    if (!this.pending && JSON.stringify(draft) === this.acknowledged) return;
    this.pending = draft;
    this.remember();
    this.notify({ status: "saving", revision: this.revision, error: this.storageError });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush(); }, 600);
  }

  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.running) return this.running;
    if (!this.pending || this.stopped) return;
    this.running = this.drain();
    await this.running;
    this.running = null;
  }

  private async drain() {
    while (this.pending && !this.stopped) {
      const sent = this.pending;
      try {
        const result = await this.persist({ ...sent, expected_revision: this.revision });
        // An unmounted writer must not overwrite a newly mounted editor's draft.
        if (this.stopped) return;
        this.revision = result.revision;
        this.acknowledged = JSON.stringify(sent);
        if (this.pending === sent) this.pending = null;
        this.remember();
        this.notify({ status: this.pending ? "saving" : "saved", revision: this.revision, error: this.storageError });
      } catch (error) {
        this.notify({ status: "error", revision: this.revision, error: error instanceof Error ? error : "Save failed." });
        return;
      }
    }
  }

  dispose() {
    clearTimeout(this.timer);
    this.stopped = true;
    this.remember();
  }
}
