import type { Feature, FeatureCollection } from "geojson";
import { describe, expect, it } from "vitest";
import type { DatasetDefinition } from "../../config/datasets/datasets.schema";
import { buildCategoricalColorScale } from "./categoricalColor";

function makeDataset(fields: DatasetDefinition["fields"], categoryField: string): DatasetDefinition {
  return {
    id: "test-1234",
    domain: "data.example.com",
    name: "Test Dataset",
    description: "A dataset for tests",
    geo: { mode: "native", field: "location" },
    fields,
    exemplars: [{ question: "test", soql: {} }],
    mapColor: "#000000",
    categoryField,
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

describe("buildCategoricalColorScale", () => {
  it("assigns distinct palette colors to top values, ranked by count", () => {
    const dataset = makeDataset([{ name: "route", type: "text", description: "", facetable: true }], "route");
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < 3; i++) {
      const count = 3 - i;
      for (let j = 0; j < count; j++) rows.push({ route: `route-${i}` });
    }
    const fc = makeFeatureCollection(rows);
    const scale = buildCategoricalColorScale(dataset, fc);

    expect(scale).toBeDefined();
    expect(scale!.entries.map((e) => e.value)).toEqual(["route-0", "route-1", "route-2"]);
    const colors = scale!.entries.map((e) => e.color);
    expect(new Set(colors).size).toBe(3);
    expect(scale!.hasOther).toBe(false);
  });

  it("marks hasOther when distinct values exceed the top-8 cap", () => {
    const dataset = makeDataset([{ name: "route", type: "text", description: "", facetable: true }], "route");
    const rows = Array.from({ length: 10 }, (_, i) => ({ route: `route-${i}` }));
    const fc = makeFeatureCollection(rows);
    const scale = buildCategoricalColorScale(dataset, fc);

    expect(scale).toBeDefined();
    expect(scale!.entries).toHaveLength(8);
    expect(scale!.hasOther).toBe(true);
  });

  it("builds a maplibre match expression with a to-string cast and fallback color", () => {
    const dataset = makeDataset([{ name: "route", type: "text", description: "", facetable: true }], "route");
    const fc = makeFeatureCollection([{ route: "B25" }, { route: "M15" }]);
    const scale = buildCategoricalColorScale(dataset, fc);

    expect(scale!.matchExpression[0]).toBe("match");
    expect(scale!.matchExpression[1]).toEqual(["to-string", ["get", "route"]]);
    expect(scale!.matchExpression.at(-1)).toBe(scale!.otherColor);
  });

  it("returns undefined when the category field is absent from the result set", () => {
    const dataset = makeDataset(
      [
        { name: "route", type: "text", description: "", facetable: true },
        { name: "status", type: "text", description: "", facetable: true },
      ],
      "status"
    );
    const fc = makeFeatureCollection([{ route: "B25" }]);
    const scale = buildCategoricalColorScale(dataset, fc);

    expect(scale).toBeUndefined();
  });
});
