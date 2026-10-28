import type { components } from "@/lib/api-schema";

export type CatalogEdit = components["schemas"]["TemplateCatalogEdit"];
export type PendingCatalogEdit = { templateId: string; label: string; request: CatalogEdit };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const catalogRecoveryKey = (projectId: string) => `nodebi:template-catalog:${projectId}`;

/** Never replay unchecked local storage as an API path or mutation. */
export function readCatalogRecovery(projectId: string): { pending?: PendingCatalogEdit; error?: boolean } {
  try {
    const raw = sessionStorage.getItem(catalogRecoveryKey(projectId));
    if (!raw) return {};
    if (raw.length > 12000) throw new Error("Invalid catalog recovery");
    const value: PendingCatalogEdit = JSON.parse(raw);
    const request = value.request;
    if (!uuid.test(value.templateId) || typeof value.label !== "string" || value.label.length > 200
      || !request || !uuid.test(request.request_id) || !Number.isSafeInteger(request.expected_revision) || request.expected_revision < 1
      || (request.name != null && (typeof request.name !== "string" || !request.name.trim() || request.name.length > 200))
      || (request.archived != null && typeof request.archived !== "boolean")
      || (request.name == null && request.archived == null)
      || Object.keys(request).some(key => !["request_id", "expected_revision", "name", "archived"].includes(key))) throw new Error("Invalid catalog recovery");
    return { pending: value };
  } catch { return { error: true }; }
}
