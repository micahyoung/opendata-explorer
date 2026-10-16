import type { FeatureCollection } from "geojson";
import { beforeEach, describe, expect, it } from "vitest";
import { useMapLayersStore } from "./mapLayersStore";

const point = (lon: number, lat: number): FeatureCollection["features"][number] => ({
  type: "Feature",
  properties: {},
  geometry: { type: "Point", coordinates: [lon, lat] },
});
const fc = (...coords: [number, number][]): FeatureCollection => ({ type: "FeatureCollection", features: coords.map(([x, y]) => point(x, y)) });
const layer = (id: string, featureCollection: FeatureCollection, where?: string, datasetId = "d") => ({ id, datasetId, where, featureCollection, summary: "" });

const state = () => useMapLayersStore.getState();

describe("addLayer", () => {
  beforeEach(() => useMapLayersStore.setState({ entries: new Map(), order: [], pendingFlyTo: undefined, activeResultsChanged: false }));

  it("returns the new layer's id", () => {
    expect(state().addLayer(layer("a", fc([0, 0])))).toBe("a");
    expect(state().order).toEqual(["a"]);
  });

  it("does not add the same result twice, and returns the layer that holds it", () => {
    state().addLayer(layer("a", fc([0, 0]), "x = 1"));
    state().clearActiveResultsChanged();
    expect(state().addLayer(layer("b", fc([0, 0]), "x = 1"))).toBe("a");
    expect(state().order).toEqual(["a"]);
    expect(state().activeResultsChanged).toBe(true);
    expect(state().pendingFlyTo).toBeDefined();
  });

  it("adds a layer when the filter, dataset or rows differ", () => {
    state().addLayer(layer("a", fc([0, 0]), "x = 1"));
    expect(state().addLayer(layer("b", fc([0, 0]), "x = 2"))).toBe("b");
    expect(state().addLayer(layer("c", fc([0, 0]), "x = 1", "other"))).toBe("c");
    expect(state().addLayer(layer("d", fc([0, 0], [1, 1]), "x = 1"))).toBe("d");
    expect(state().order).toEqual(["a", "b", "c", "d"]);
  });
});
