import type { Update } from "./api";

export async function downloadInputFile(row: Update, kind: "current" | "template" = "current") {
  const info = row.file_exchange;
  if (!info) return;
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/updates/${row.id}/files/${kind}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail?.message ?? "The request could not be completed.");
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = kind === "current" ? info.filename : `template.${info.connector === "csv" ? "csv" : "xlsx"}`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
