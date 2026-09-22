export type ApiIssue = { code: string; message: string; node_id?: string | null; edge_id?: string | null; field?: string | null };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly nodeId?: string,
    readonly field?: string,
    readonly issues: ApiIssue[] = [],
    readonly correlationId?: string,
  ) { super(correlationId ? `${message} (Diagnostic ID: ${correlationId})` : message); }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const result = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...init?.headers },
  });
  if (!result.ok) {
    const body = await result.json().catch(() => null);
    const detail = body?.detail;
    throw new ApiError(
      detail?.message ?? "The request could not be completed.", result.status,
      detail?.code ?? "REQUEST_FAILED", detail?.node_id, detail?.field,
      detail?.issues ?? [], detail?.correlation_id ?? detail?.execution_id,
    );
  }
  return result.status === 204 ? (undefined as T) : result.json();
}
