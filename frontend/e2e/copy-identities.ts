/** Acceptance-fixture identity remapping, not a public project import format. */
export function remapIdentities<T>(value: T, ids: Record<string, string>): T {
  const tokens = Object.fromEntries(Object.entries(ids).flatMap(([from, to]) => [[from, to], [from.replaceAll("-", ""), to.replaceAll("-", "")]]));
  const replace = (text: string) => text.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32}/g, token => tokens[token] ?? token);
  const visit = (item: unknown): unknown => typeof item === "string" ? replace(item) : Array.isArray(item) ? item.map(visit) : item && typeof item === "object" ? Object.fromEntries(Object.entries(item).map(([key, child]) => [replace(key), visit(child)])) : item;
  return visit(value) as T;
}
