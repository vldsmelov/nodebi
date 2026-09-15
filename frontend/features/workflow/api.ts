import type { NodeDefinition, NodePreview, Workflow, WorkflowSave, WorkflowSchemaResult, WorkflowSummary } from "./types";

import { apiRequest as request } from "@/lib/api";

export async function listWorkflows(projectId: string): Promise<WorkflowSummary[]> {
  const result = await request<{ items: WorkflowSummary[] }>(
    `/api/v1/projects/${projectId}/workflows`,
  );
  return result.items;
}

export function createWorkflow(projectId: string, name: string): Promise<Workflow> {
  return request(`/api/v1/projects/${projectId}/workflows`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function getWorkflow(workflowId: string): Promise<Workflow> {
  return request(`/api/v1/workflows/${workflowId}`);
}

export function getWorkflowSchema(workflowId: string): Promise<WorkflowSchemaResult> {
  return request(`/api/v1/workflows/${workflowId}/schema`);
}

export function previewWorkflowNode(
  workflowId: string,
  nodeId: string,
  limit = 100,
  parameters: import("./types").ParameterValues = {},
): Promise<NodePreview> {
  return request(`/api/v1/workflows/${workflowId}/nodes/${nodeId}/preview`, {
    method: "POST",
    body: JSON.stringify({ limit, parameters }),
  });
}

export function saveWorkflow(workflowId: string, payload: WorkflowSave): Promise<Workflow> {
  return request(`/api/v1/workflows/${workflowId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getNodeCatalog(): Promise<NodeDefinition[]> {
  const result = await request<{ items: NodeDefinition[] }>("/api/v1/node-catalog");
  return result.items;
}
