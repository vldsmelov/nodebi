import type { GraphDraft } from "./autosave";

/** Local editing history. Server revision and execution/view state never enter snapshots. */
export class GraphHistory {
  private past: string[] = [];
  private future: string[] = [];
  private current: string;
  private group: string | null = null;
  private version = 0;
  private listeners = new Set<() => void>();
  constructor(initial: GraphDraft, private readonly limit = 50, private readonly bytes = 16 * 1024 * 1024) {
    this.current = JSON.stringify(initial);
  }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getVersion = () => this.version;
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
  private notify() { this.version++; this.listeners.forEach(listener => listener()); }
  private trim() {
    while (this.past.length + this.future.length > this.limit || 2 * [this.current, ...this.past, ...this.future].reduce((sum, item) => sum + item.length, 0) > this.bytes) {
      if (this.past.length) this.past.shift(); else if (this.future.length) this.future.shift(); else break;
    }
  }
  record(graph: GraphDraft, group: string | null = null) {
    const next = JSON.stringify(graph);
    if (next === this.current) return;
    if (!group || group !== this.group) this.past.push(this.current);
    this.current = next; this.group = group; this.future = []; this.trim(); this.notify();
  }
  undo(): GraphDraft | null {
    const previous = this.past.pop();
    if (!previous) return null;
    this.future.push(this.current); this.current = previous; this.group = null; this.notify();
    return JSON.parse(this.current);
  }
  redo(): GraphDraft | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(this.current); this.current = next; this.group = null; this.notify();
    return JSON.parse(this.current);
  }
}
