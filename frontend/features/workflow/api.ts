import type { NodeDefinition, NodePreview, Workflow, WorkflowSave, WorkflowSchemaResult, WorkflowSummary } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const result = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!result.ok) {
    const body = await result.json().catch(() => null);
    throw new Error(body?.detail?.message ?? "The request could not be completed.");
  }
  return result.status === 204 ? (undefined as T) : result.json();
}

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
): Promise<NodePreview> {
  return request(`/api/v1/workflows/${workflowId}/nodes/${nodeId}/preview`, {
    method: "POST",
    body: JSON.stringify({ limit }),
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
