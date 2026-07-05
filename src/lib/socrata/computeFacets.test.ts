import type { Feature, FeatureCollection } from "geojson";
import { describe, expect, it } from "vitest";
import type { DatasetDefinition } from "../../config/datasets/datasets.schema";
import { computeFacets, formatFacetSummary } from "./computeFacets";

function makeDataset(fields: DatasetDefinition["fields"]): DatasetDefinition {
  return {
    backend: "socrata",
    id: "test-1234",
    domain: "data.example.com",
    name: "Test Dataset",
    description: "A dataset for tests",
    geo: { mode: "native", field: "location" },
    fields,
    exemplars: [{ question: "test", soql: {} }],
    mapColor: "#000000",
    categoryField: fields[0].name,
  };
}

function makeFeatureCollection(propsList: Record<string, unknown>[]): FeatureCollection {
  const features: Feature[] = propsList.map((properties) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [0, 0] },
    properties,
  }));
  return { type: "FeatureCollection", features };
}

describe("computeFacets", () => {
  it("orders top values by count descending and caps at 8", () => {
    const dataset = makeDataset([{ name: "route", type: "text", description: "", facetable: true }]);
    const rows: Record<string, unknown>[] = [];
    // 10 distinct values with distinguishable counts, route-0 highest
    for (let i = 0; i < 10; i++) {
      const count = 10 - i;
      for (let j = 0; j < count; j++) rows.push({ route: `route-${i}` });
    }
    const fc = makeFeatureCollection(rows);
    const facets = computeFacets(dataset, fc);

    expect(facets).toHaveLength(1);
    const facet = facets[0];
    expect(facet.field).toBe("route");
    expect(facet.distinctCount).toBe(10);
    expect(facet.topValues).toHaveLength(8);
    expect(facet.topValues[0]).toEqual({ value: "route-0", count: 10 });
    expect(facet.topValues[7]).toEqual({ value: "route-7", count: 3 });
  });

  it("omits a facetable field absent from properties (narrowed $select)", () => {
    const dataset = makeDataset([
      { name: "route", type: "text", description: "", facetable: true },
      { name: "status", type: "text", description: "", facetable: true },
    ]);
    const fc = makeFeatureCollection([{ route: "B25" }, { route: "M15" }]);
    const facets = computeFacets(dataset, fc);

    expect(facets.map((f) => f.field)).toEqual(["route"]);
  });

  it("marks overflowed once distinct values exceed the tracking cap", () => {
    const dataset = makeDataset([{ name: "id", type: "text", description: "", facetable: true }]);
    const rows = Array.from({ length: 600 }, (_, i) => ({ id: `id-${i}` }));
    const fc = makeFeatureCollection(rows);
    const facets = computeFacets(dataset, fc);

    const facet = facets[0];
    expect(facet.overflowed).toBe(true);
    expect(facet.distinctCount).toBe(500);
  });

  it("returns no facets for an empty feature collection", () => {
    const dataset = makeDataset([{ name: "route", type: "text", description: "", facetable: true }]);
    const fc = makeFeatureCollection([]);
    const facets = computeFacets(dataset, fc);

    expect(facets).toEqual([]);
  });

  it("reflects the true distinct count in a dominant-value-plus-singletons regression case", () => {
    // Shaped like the actual bug: one route (B25) monopolizes results, but
    // many other routes each have exactly one violation.
    const dataset = makeDataset([{ name: "bus_route_id", type: "text", description: "", facetable: true }]);
    const rows: Record<string, unknown>[] = Array.from({ length: 950 }, () => ({ bus_route_id: "B25" }));
    for (let i = 0; i < 49; i++) {
      rows.push({ bus_route_id: `route-${i}` });
    }
    const fc = makeFeatureCollection(rows);
    const facets = computeFacets(dataset, fc);

    const facet = facets[0];
    expect(facet.distinctCount).toBe(50);
    expect(facet.topValues[0]).toEqual({ value: "B25", count: 950 });
  });
});

describe("formatFacetSummary", () => {
  it("renders a compact one-line-per-field summary including '+K more'", () => {
    const facets = [
      {
        field: "bus_route_id",
        distinctCount: 12,
        overflowed: false,
        topValues: [
          { value: "B25", count: 950 },
          { value: "M15+", count: 12 },
          { value: "Q53+", count: 8 },
        ],
      },
    ];

    const summary = formatFacetSummary(facets);
    expect(summary).toBe("bus_route_id: 12 distinct — B25 (950), M15+ (12), Q53+ (8), ... +9 more");
  });

  it("returns an empty string for no facets", () => {
    expect(formatFacetSummary([])).toBe("");
  });
});
