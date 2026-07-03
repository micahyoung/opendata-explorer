import type { FeatureCollection } from "geojson";
import type { DatasetDefinition } from "../../config/datasets/datasets.schema";

const TOP_N = 8;
const MAX_TRACKED_DISTINCT = 500;

export interface FieldFacetValue {
  value: string;
  count: number;
}

export interface FieldFacet {
  field: string;
  distinctCount: number;
  overflowed: boolean;
  topValues: FieldFacetValue[];
}

/**
 * Computes top-value breakdowns for the dataset's curated facetable fields,
 * scoped to whatever the query actually returned (so a narrowing $select
 * that drops a facetable field simply omits it here).
 */
export function computeFacets(dataset: DatasetDefinition, featureCollection: FeatureCollection): FieldFacet[] {
  const facetableFields = dataset.fields.filter((f) => f.facetable).map((f) => f.name);
  const facets: FieldFacet[] = [];

  for (const field of facetableFields) {
    const counts = new Map<string, number>();
    let overflowed = false;
    let presentInAnyFeature = false;

    for (const feature of featureCollection.features) {
      const properties = feature.properties;
      if (!properties || !(field in properties)) continue;
      presentInAnyFeature = true;

      const raw = properties[field];
      const value = raw === null || raw === undefined ? "(null)" : String(raw);

      const existing = counts.get(value);
      if (existing !== undefined) {
        counts.set(value, existing + 1);
      } else if (counts.size < MAX_TRACKED_DISTINCT) {
        counts.set(value, 1);
      } else {
        overflowed = true;
      }
    }

    if (!presentInAnyFeature) continue;

    const topValues = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N)
      .map(([value, count]) => ({ value, count }));

    facets.push({
      field,
      distinctCount: counts.size,
      overflowed,
      topValues,
    });
  }

  return facets;
}

export function formatFacetSummary(facets: FieldFacet[]): string {
  return facets
    .map((facet) => {
      const shown = facet.topValues.map((v) => `${v.value} (${v.count})`).join(", ");
      const remaining = facet.distinctCount - facet.topValues.length;
      const more = remaining > 0 ? `, ... +${remaining} more` : "";
      const distinctLabel = facet.overflowed ? `${facet.distinctCount}+` : `${facet.distinctCount}`;
      return `${facet.field}: ${distinctLabel} distinct — ${shown}${more}`;
    })
    .join("; ");
}
