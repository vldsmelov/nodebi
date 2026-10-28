/** Spreadsheet TSV, including quoted tabs/newlines. Values are never evaluated. */
export function clipboardTable(text: string): string[][] {
  if (text.length > 200000) throw new Error("The pasted range is too large. Paste a smaller range.");
  const rows: string[][] = [], row: string[] = [];
  let value = "", quoted = false, count = 0;
  const cell = () => { row.push(value); value = ""; if (++count > 2000) throw new Error("The pasted range is too large. Paste a smaller range."); };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && (quoted || !value)) {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && char === "\t") cell();
    else if (!quoted && (char === "\n" || char === "\r")) { cell(); rows.push([...row]); row.length = 0; if (char === "\r" && text[i + 1] === "\n") i++; }
    else value += char;
  }
  if (quoted) throw new Error("The pasted range has incomplete quoted values.");
  if (value || row.length || !rows.length) { cell(); rows.push([...row]); }
  return rows;
}
