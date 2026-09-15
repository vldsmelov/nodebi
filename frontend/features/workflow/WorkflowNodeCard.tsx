import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-provider";
import { nodeLabel } from "./graph-interaction";
import { Database } from "lucide-react";
import type { NodeDefinition } from "./types";

export type EditorNodeData = {
  definition: NodeDefinition;
  config: Record<string, unknown>;
  ui?: Record<string, unknown>;
  validationError?: string;
};
export type EditorNode = Node<EditorNodeData, "workflowNode">;

export function WorkflowNodeCard({ data, selected }: NodeProps<EditorNode>) {
  const { t, nodeName, errorText } = useI18n();
  const { palette } = useTheme();
  return (
    <div className={`w-64 rounded-2xl border bg-control shadow-xl transition ${selected ? "border-accent shadow-accent/10" : "border-outline"}`}>
      {data.definition.input_ports.map((port, index) => (
        <Handle key={port.id} id={port.id} type="target" position={Position.Left} style={{ top: 52 + index * 24, background: palette.accent }} title={t(port.display_name)} />
      ))}
      <div className="flex items-center gap-3 border-b border-outline px-4 py-3">
        <span className="grid size-8 place-items-center rounded-lg bg-accent/10 text-accent"><Database size={16} /></span>
        <div className="min-w-0"><p className="break-words text-sm font-semibold text-foreground">{nodeLabel(data, nodeName(data.definition.type))}</p><p className="text-[10px] uppercase tracking-[0.18em] text-muted">{nodeName(data.definition.type)}</p></div>
      </div>
      <div className="px-4 py-3 text-xs text-muted">{data.validationError ? errorText(data.validationError) : (data.definition.type === "filter" && Array.isArray(data.config.conditions) ? t("Conditions: {0}", { 0: data.config.conditions.length }) : t(data.definition.description))}</div>
      {data.definition.output_ports.map((port, index) => (
        <Handle key={port.id} id={port.id} type="source" position={Position.Right} style={{ top: 52 + index * 24, background: palette.accent }} title={t(port.display_name)} />
      ))}
    </div>
  );
}
