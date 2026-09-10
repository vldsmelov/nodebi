import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
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
  return (
    <div className={`min-w-56 rounded-2xl border bg-[#151b12] shadow-xl transition ${selected ? "border-[#b7ff5a] shadow-[#b7ff5a]/10" : "border-white/15"}`}>
      {data.definition.input_ports.map((port, index) => (
        <Handle key={port.id} id={port.id} type="target" position={Position.Left} style={{ top: 52 + index * 24, background: "#b7ff5a" }} title={port.display_name} />
      ))}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <span className="grid size-8 place-items-center rounded-lg bg-[#b7ff5a]/10 text-[#b7ff5a]"><Database size={16} /></span>
        <div><p className="text-sm font-semibold text-white">{data.definition.display_name}</p><p className="text-[10px] uppercase tracking-[0.18em] text-white/35">{data.definition.category}</p></div>
      </div>
      <div className="px-4 py-3 text-xs text-white/45">{data.validationError ?? (typeof data.config.sheet_name === "string" ? data.config.sheet_name : "Select this node to configure it")}</div>
      {data.definition.output_ports.map((port, index) => (
        <Handle key={port.id} id={port.id} type="source" position={Position.Right} style={{ top: 52 + index * 24, background: "#b7ff5a" }} title={port.display_name} />
      ))}
    </div>
  );
}
