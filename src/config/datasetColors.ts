/**
 * Per-dataset accent color, shared between the map dot styling (DataLayer)
 * and the chat's tool-call cards, so a dataset reads as the same "sign
 * color" everywhere it appears.
 */
import { getDataset } from "./datasets";

export const DEFAULT_DATASET_COLOR = "#14181a";

export function getDatasetColor(datasetId: string | undefined): string {
  if (!datasetId) return DEFAULT_DATASET_COLOR;
  return getDataset(datasetId)?.mapColor ?? DEFAULT_DATASET_COLOR;
}
