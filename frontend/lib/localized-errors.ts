import { type Locale, translate } from "./locale";
import { translations } from "./translations";

/** API codes and diagnostic IDs stay intact. Unknown server prose is not exposed as UI copy. */
export function localizeError(locale: Locale, error: unknown): string {
  const detail = typeof error === "object" && error !== null ? error as { message?: string; code?: string; field?: string; nodeId?: string; node_id?: string; correlationId?: string; issues?: unknown[] } : {};
  const message = typeof error === "string" ? error : detail.message ?? "The request could not be completed.";
  if (locale === "en") return message;
  const diagnostic = message.match(/ \(Diagnostic ID: (.+)\)$/);
  const raw = diagnostic ? message.slice(0, diagnostic.index) : message;
  let result = translateKnownMessage(locale, raw) ?? translate(locale, detail.code && translations[detail.code] ? detail.code : "The request could not be completed.");
  if (detail.field) result += ` ${translate(locale, "Field: {0}", { 0: detail.field })}`;
  if (detail.nodeId || detail.node_id) result += ` ${translate(locale, "Node: {0}", { 0: detail.nodeId ?? detail.node_id! })}`;
  if (detail.code) result += ` [${detail.code}]`;
  if (diagnostic || detail.correlationId) result += ` (${translate(locale, "Diagnostic ID: {0}", { 0: diagnostic?.[1] ?? detail.correlationId! })})`;
  if (detail.issues?.length) result += " " + detail.issues.map(issue => localizeError(locale, issue)).join(" ");
  return result;
}

const messagePatterns: readonly [RegExp, string][] = [
  [/^Dashboard parameter '(.+)' is required\.$/, "Dashboard parameter '{0}' is required."],
  [/^Parameter '(.+)' requires (.+)\.$/, "Parameter '{0}' requires {1}."],
  [/^Filter parameter '(.+)' is required\.$/, "Filter parameter '{0}' is required."],
  [/^Filter parameter '(.+)' is not declared\.$/, "Filter parameter '{0}' is not declared."],
  [/^Filter parameter '(.+)' has an incompatible type\.$/, "Filter parameter '{0}' has an incompatible type."],
  [/^Cannot convert field (.+) at row (.+) to (.+)\.$/, "Cannot convert field {0} at row {1} to {2}."],
  [/^Formula has no saved result at (.+)\. Recalculate and save the workbook in Excel before uploading\.$/, "Formula has no saved result at {0}. Recalculate and save the workbook in Excel before uploading."],
  [/^Unknown column ID: ([\s\S]+)\.$/, "Unknown column ID: {0}."],
  [/^Unknown field: ([\s\S]+)\. Use \[column_id\] for unusual names\.$/, "Unknown field: {0}. Use [column_id] for unusual names."],
  [/^Field ([\s\S]+) must be numeric\.$/, "Field {0} must be numeric."],
  [/^Filtered column no longer exists: ([\s\S]+)\.$/, "Filtered column no longer exists: {0}."],
  [/^Selected columns no longer exist: ([\s\S]+)\.$/, "Selected columns no longer exist: {0}."],
  [/^Columns to rename no longer exist: ([\s\S]+)\.$/, "Columns to rename no longer exist: {0}."],
  [/^Operator '([\s\S]+)' is not valid for ([\s\S]+)\.$/, "Operator '{0}' is not valid for {1}."],
  [/^Value '([\s\S]+)' is invalid for ([\s\S]+)\.$/, "Value '{0}' is invalid for {1}."],
];
function translateKnownMessage(locale: Locale, message: string): string | undefined {
  if (translations[message]) return translate(locale, message);
  for (const [pattern, key] of messagePatterns) {
    const match = message.match(pattern);
    if (match) return translate(locale, key, Object.fromEntries(match.slice(1).map((value, index) => [index, value])));
  }
  // Pydantic may wrap a domain validation message; translate that message and omit its internal dump.
  const validation = message.match(/Value error, ([^\n]+?) \[type=/);
  if (validation) return translateKnownMessage(locale, validation[1]);
  return undefined;
}
