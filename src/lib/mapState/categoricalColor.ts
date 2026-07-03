import type { FeatureCollection } from "geojson";
import type { DatasetDefinition } from "../../config/datasets/datasets.schema";
import { computeFacets } from "../socrata/computeFacets";

/**
 * Fixed hue order from the dataviz skill's validated default categorical
 * palette (worst adjacent CVD ΔE 24.2) — order matters for CVD safety, so
 * slots are assigned in this sequence rather than picked arbitrarily.
 */
const CATEGORY_PALETTE = [
  "#2a78d6", // blue
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
  "#e87ba4", // magenta
  "#eb6834", // orange
];

const OTHER_COLOR = "#8b938e"; // --ink-faint

export interface CategoryColorEntry {
  value: string;
  color: string;
  count: number;
}

export interface CategoricalColorScale {
  entries: CategoryColorEntry[];
  otherColor: string;
  hasOther: boolean;
  matchExpression: unknown[];
}

export function buildCategoricalColorScale(
  dataset: DatasetDefinition,
  featureCollection: FeatureCollection
): CategoricalColorScale | undefined {
  const facet = computeFacets(dataset, featureCollection).find((f) => f.field === dataset.categoryField);
  if (!facet) return undefined;

  const entries: CategoryColorEntry[] = facet.topValues.map((v, i) => ({
    value: v.value,
    count: v.count,
    color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
  }));

  const hasOther = facet.distinctCount > entries.length;

  const matchExpression: unknown[] = ["match", ["to-string", ["get", dataset.categoryField]]];
  for (const entry of entries) {
    matchExpression.push(entry.value, entry.color);
  }
  matchExpression.push(OTHER_COLOR);

  return { entries, otherColor: OTHER_COLOR, hasOther, matchExpression };
}
