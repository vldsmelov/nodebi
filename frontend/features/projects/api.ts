export type Project = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail?.message ?? "The request could not be completed.");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

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
