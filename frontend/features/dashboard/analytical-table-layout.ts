export const rowLevelWidth = 160;
export const dataColumnWidth = 200;
export const selectionColumnWidth = 100;

// Always reserve one complete data column outside the pinned area.
export function tablePinning(width: number | null, requested: number) {
  if (width === null) return { rowLevel: true, columns: requested };
  const rowLevel = width >= rowLevelWidth + dataColumnWidth;
  return {
    rowLevel,
    columns: rowLevel ? Math.min(requested, Math.max(0, Math.floor((width - rowLevelWidth - dataColumnWidth) / dataColumnWidth))) : 0,
  };
}
