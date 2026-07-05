import { describe, expect, it } from "vitest";
import type { ArcgisDatasetDefinition } from "../../config/datasets/datasets.schema";
import type { ArcgisQueryParams } from "../../types/arcgisTool";
import { buildArcgisUrl } from "./buildArcgisUrl";

function makeDataset(): ArcgisDatasetDefinition {
  return {
    backend: "arcgis",
    id: "test-arcgis",
    featureServerUrl: "https://example.com/arcgis/rest/services/Test/FeatureServer/0",
    name: "Test ArcGIS Dataset",
    description: "A dataset for tests",
    fields: [{ name: "CATEGORY", type: "esriFieldTypeString", description: "" }],
    exemplars: [{ question: "test", query: {} }],
    mapColor: "#000000",
    categoryField: "CATEGORY",
  };
}

function makeParams(overrides: Partial<ArcgisQueryParams> = {}): ArcgisQueryParams {
  return { datasetId: "test-arcgis", ...overrides };
}

describe("buildArcgisUrl", () => {
  it("omits spatial params when no bbox fields are given", () => {
    const url = new URL(buildArcgisUrl(makeDataset(), makeParams()));
    expect(url.searchParams.has("geometry")).toBe(false);
    expect(url.searchParams.has("geometryType")).toBe(false);
    expect(url.searchParams.has("spatialRel")).toBe(false);
    expect(url.searchParams.has("inSR")).toBe(false);
  });

  it("adds an envelope geometry filter when all four bbox fields are given", () => {
    const url = new URL(
      buildArcgisUrl(
        makeDataset(),
        makeParams({ minLat: 40.7456561, maxLat: 40.7656561, minLon: -73.8957755, maxLon: -73.8757755 })
      )
    );
    expect(url.searchParams.get("geometry")).toBe("-73.8957755,40.7456561,-73.8757755,40.7656561");
    expect(url.searchParams.get("geometryType")).toBe("esriGeometryEnvelope");
    expect(url.searchParams.get("spatialRel")).toBe("esriSpatialRelIntersects");
    expect(url.searchParams.get("inSR")).toBe("4326");
  });

  it("omits spatial params when only some bbox fields are given", () => {
    const url = new URL(buildArcgisUrl(makeDataset(), makeParams({ minLat: 40.7456561, maxLat: 40.7656561 })));
    expect(url.searchParams.has("geometry")).toBe(false);
    expect(url.searchParams.has("geometryType")).toBe(false);
    expect(url.searchParams.has("spatialRel")).toBe(false);
    expect(url.searchParams.has("inSR")).toBe(false);
  });

  it("still applies existing where/outFields/resultRecordCount behavior unchanged", () => {
    const url = new URL(buildArcgisUrl(makeDataset(), makeParams({ where: "CATEGORY = 'X'", resultRecordCount: 50 })));
    expect(url.searchParams.get("where")).toBe("CATEGORY = 'X'");
    expect(url.searchParams.get("outFields")).toBe("*");
    expect(url.searchParams.get("resultRecordCount")).toBe("50");
    expect(url.searchParams.get("f")).toBe("geojson");
    expect(url.searchParams.get("outSR")).toBe("4326");
  });
});
