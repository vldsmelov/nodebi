import type { NodeDefinition, WorkflowNode } from "./types";

/** Persisted nodes always resolve their exact contract, never the first/newest version. */
export function findNodeDefinition(catalog: NodeDefinition[], node?: Pick<WorkflowNode, "type" | "version">) {
  return node ? catalog.find(item => item.type === node.type && item.version === node.version) : undefined;
}

export const definitionKey = (node: Pick<NodeDefinition, "type" | "version">) => `${node.type}:${node.version}`;

/** Keep ordinary labels short; distinguish choices when multiple contracts coexist. */
export function definitionLabel(catalog: NodeDefinition[], node: NodeDefinition, name: string): string {
  return catalog.some(item => item.type === node.type && item.version !== node.version)
    ? `${name} · v${node.version}` : name;
}
