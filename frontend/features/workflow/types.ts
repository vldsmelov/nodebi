import type { components } from "@/lib/api-schema";

export type WorkflowPosition = components["schemas"]["PositionPayload"];
export type WorkflowParameter = components["schemas"]["ParameterDefinition"];
export type ParameterValues = Record<string, string | number | boolean | null>;
export type WorkflowNode = components["schemas"]["NodePayload"];
export type WorkflowEdge = components["schemas"]["EdgePayload"];
export type Workflow = components["schemas"]["WorkflowRead"];
export type WorkflowSummary = components["schemas"]["WorkflowSummary"];
export type NodePort = components["schemas"]["PortRead"];
export type NodeDefinition = components["schemas"]["NodeDefinitionRead"];
export type WorkflowSave = components["schemas"]["WorkflowSave"];
export type GraphIssue = components["schemas"]["GraphIssueRead"];
export type ResolvedColumn = components["schemas"]["ResolvedColumnRead"];
export type NodeSchemaResult = components["schemas"]["NodeSchemaRead"];
export type WorkflowSchemaResult = components["schemas"]["WorkflowSchemaRead"];
export type NodePreview = components["schemas"]["PreviewRead"];
