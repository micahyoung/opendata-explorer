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
    let missingCount = 0;

    for (const feature of featureCollection.features) {
      const properties = feature.properties;
      if (!properties || !(field in properties)) continue;
      presentInAnyFeature = true;

      const raw = properties[field];
      if (raw === null || raw === undefined || raw === "") {
        // Rows missing this field's value are folded into the "Other" bucket
        // (via distinctCount below) rather than minted as their own "(null)"
        // category — a category legend entry for "missing data" isn't a
        // meaningful bucket to a user, e.g. Durham's empty tree-planting
        // sites have no species by definition, not a "(null)" species.
        missingCount++;
        continue;
      }
      const value = String(raw);

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
      distinctCount: counts.size + (missingCount > 0 ? 1 : 0),
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
