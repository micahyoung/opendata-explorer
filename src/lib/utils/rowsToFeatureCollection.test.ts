import { describe, expect, it } from "vitest";
import { rowsToFeatureCollection } from "./rowsToFeatureCollection";

describe("rowsToFeatureCollection", () => {
  it("converts string lat/lon fields to a Point feature", () => {
    const result = rowsToFeatureCollection(
      [{ case_id: "1", latitude: "42.31287", longitude: "-71.121339" }],
      "latitude",
      "longitude"
    );
    expect(result.features).toHaveLength(1);
    expect(result.features[0].geometry).toEqual({ type: "Point", coordinates: [-71.121339, 42.31287] });
    expect(result.features[0].properties).toEqual({ case_id: "1" });
  });

  it("drops rows with non-numeric lat/lon", () => {
    const result = rowsToFeatureCollection([{ latitude: "", longitude: "" }, { latitude: "abc", longitude: "def" }], "latitude", "longitude");
    expect(result.features).toHaveLength(0);
  });

  it("drops Null Island (0,0) sentinel rows", () => {
    const result = rowsToFeatureCollection([{ latitude: "0", longitude: "0" }], "latitude", "longitude");
    expect(result.features).toHaveLength(0);
  });

  it("strips the lat/lon fields out of properties", () => {
    const result = rowsToFeatureCollection([{ latitude: "1", longitude: "2", case_topic: "Noise" }], "latitude", "longitude");
    expect(result.features[0].properties).toEqual({ case_topic: "Noise" });
  });
});
