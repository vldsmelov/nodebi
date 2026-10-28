export type RadarAxisDraft = { column_id: string; minimum: string; maximum: string };
export type RadarDraft = { type: "radar_chart"; version: 1; profile_column_id: string; normalization: string; axes: RadarAxisDraft[] };
export const emptyRadarAxis = (): RadarAxisDraft => ({ column_id: "", minimum: "", maximum: "" });
export function radarDraft(config: Record<string, unknown>): RadarDraft {
  return config.spec as RadarDraft ?? { type: "radar_chart", version: 1, profile_column_id: "", normalization: "", axes: [emptyRadarAxis(), emptyRadarAxis(), emptyRadarAxis()] };
}
