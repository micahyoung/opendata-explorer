/**
 * Per-dataset accent color, shared between the map dot styling (DataLayer)
 * and the chat's tool-call cards, so a dataset reads as the same "sign
 * color" everywhere it appears.
 */
export const DATASET_COLORS: Record<string, string> = {
  "erm2-nwe9": "#d65a1f", // 311 Service Requests — alert orange
  "uvpi-gqnh": "#0b5d3b", // 2015 Street Tree Census — sign green
};

export const DEFAULT_DATASET_COLOR = "#14181a";

export function getDatasetColor(datasetId: string | undefined): string {
  if (!datasetId) return DEFAULT_DATASET_COLOR;
  return DATASET_COLORS[datasetId] ?? DEFAULT_DATASET_COLOR;
}
