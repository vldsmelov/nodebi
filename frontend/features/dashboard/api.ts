import { apiRequest } from "@/lib/api";
import type { components } from "@/lib/api-schema";

export type Dashboard = components["schemas"]["DashboardRead"];
export type Widget = components["schemas"]["WidgetPayload"];
export type Visualization = components["schemas"]["VisualizationRead"];
export type VisualizationResult = components["schemas"]["VisualizationResult"];
export const listDashboards = async (project: string) => (await apiRequest<components["schemas"]["DashboardList"]>(`/api/v1/projects/${project}/dashboards`)).items;
export const listVisualizations = async (project: string) => (await apiRequest<components["schemas"]["VisualizationList"]>(`/api/v1/projects/${project}/visualizations`)).items;
export const createDashboard = (project: string, name: string) => apiRequest<Dashboard>(`/api/v1/projects/${project}/dashboards`, { method: "POST", body: JSON.stringify({ name }) });
export const saveDashboard = (dashboard: Dashboard) => apiRequest<Dashboard>(`/api/v1/dashboards/${dashboard.id}`, { method: "PUT", body: JSON.stringify({ name: dashboard.name, expected_revision: dashboard.revision, widgets: dashboard.widgets }) });
export const getVisualizationResult = (identity: string, offset = 0, parameters?: import("@/features/workflow/types").ParameterValues) => parameters && Object.keys(parameters).length ? apiRequest<VisualizationResult>(`/api/v1/visualizations/${identity}/result`, { method: "POST", body: JSON.stringify({ parameters, offset, limit: 100 }) }) : apiRequest<VisualizationResult>(`/api/v1/visualizations/${identity}/result?offset=${offset}&limit=100`);
export const deleteDashboard = (identity: string) => apiRequest<void>(`/api/v1/dashboards/${identity}`, { method: "DELETE" });
