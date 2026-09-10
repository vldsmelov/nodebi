import type { components } from "@/lib/api-schema";
import { apiRequest as request } from "@/lib/api";
export type Project = components["schemas"]["ProjectRead"];

export async function listProjects(): Promise<Project[]> {
  const result = await request<{ items: Project[] }>("/api/v1/projects");
  return result.items;
}

export const getProject = (id: string) => request<Project>(`/api/v1/projects/${id}`);
export const createProject = (name: string) =>
  request<Project>("/api/v1/projects", { method: "POST", body: JSON.stringify({ name }) });
export const renameProject = (id: string, name: string) =>
  request<Project>(`/api/v1/projects/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
export const deleteProject = (id: string) =>
  request<void>(`/api/v1/projects/${id}?confirm=true`, { method: "DELETE" });
