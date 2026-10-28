/** Human-readable, view-only disambiguation. Call before filtering so search never renumbers. */
export function choiceLabels<T extends { id: string; label: string }>(items: T[]): T[] {
  const counts = new Map<string, number>();
  const reserved = new Set(items.map(item => item.label));
  for (const item of items) counts.set(item.label, (counts.get(item.label) ?? 0) + 1);
  const ordinals = new Map<string, number>();
  return items.map(item => {
    if (counts.get(item.label) === 1) return item;
    let ordinal = (ordinals.get(item.label) ?? 0) + 1;
    while (reserved.has(`${item.label} · ${ordinal}`)) ordinal++;
    const label = `${item.label} · ${ordinal}`;
    ordinals.set(item.label, ordinal);
    reserved.add(label);
    return { ...item, label };
  });
}
