export type WorkflowPosition = { x: number; y: number };

export type WorkflowNode = {
  id: string;
  type: string;
  version: number;
  position: WorkflowPosition;
  config: Record<string, unknown>;
  ui: Record<string, unknown>;
};

export type WorkflowEdge = {
  id: string;
  source_node_id: string;
  source_port: string;
  target_node_id: string;
  target_port: string;
};

export type Workflow = {
  id: string;
  project_id: string;
  name: string;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  created_at: string;
  updated_at: string;
};

export type WorkflowSummary = Pick<Workflow, "id" | "project_id" | "name" | "version">;

export type NodePort = {
  id: string;
  display_name: string;
  kind: string;
  required: boolean;
  max_connections: number | null;
};

export type NodeDefinition = {
  type: string;
  version: number;
  category: "source" | "transform" | "visualization";
  display_name: string;
  description: string;
  icon: string | null;
  input_ports: NodePort[];
  output_ports: NodePort[];
};

export type WorkflowSave = Pick<Workflow, "name" | "nodes" | "edges">;

export type GraphIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
  node_id: string | null;
  edge_id: string | null;
  field: string | null;
};

export type ResolvedColumn = {
  column_id: string;
  engine_name: string;
  display_name: string;
  logical_type: string;
  nullable: boolean;
  metadata: Record<string, unknown>;
};

export type NodeSchemaResult = {
  node_id: string;
  columns: ResolvedColumn[] | null;
  issues: GraphIssue[];
};

export type WorkflowSchemaResult = {
  valid: boolean;
  nodes: NodeSchemaResult[];
  issues: GraphIssue[];
};

export type NodePreview = {
  execution_id: string;
  node_id: string;
  status: "succeeded";
  columns: ResolvedColumn[];
  rows: Record<string, unknown>[];
  returned_rows: number;
  total_rows: number;
  truncated: boolean;
  duration_ms: number;
  metadata: Record<string, unknown>;
  warnings: string[];
};
