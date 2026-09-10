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
export const getVisualizationResult = (identity: string) => apiRequest<VisualizationResult>(`/api/v1/visualizations/${identity}/result`);
