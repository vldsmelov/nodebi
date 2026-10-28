import type { NodeSchemaResult, ResolvedColumn } from "./types";

/** Named outputs are authoritative; never substitute another port's fields. */
export function outputColumns(node: NodeSchemaResult | undefined, port = "dataset"): ResolvedColumn[] | null {
  return node?.outputs ? node.outputs[port]?.columns ?? null : node?.columns ?? null;
}
