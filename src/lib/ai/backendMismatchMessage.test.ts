import { describe, expect, it } from "vitest";
import { backendMismatchMessage } from "./backendMismatchMessage";

describe("backendMismatchMessage", () => {
  it("names the ArcGIS tool when an ArcGIS dataset is sent to the Socrata tool", () => {
    const message = backendMismatchMessage("socrata", "sacramento-street-trees");
    expect(message).toContain("ArcGIS-backed");
    expect(message).toContain("fetchArcGisData");
  });

  it("names the Socrata tool when a Socrata dataset is sent to the ArcGIS tool", () => {
    const message = backendMismatchMessage("arcgis", "erm2-nwe9");
    expect(message).toContain("Socrata-backed");
    expect(message).toContain("fetchSocrataData");
  });

  it("reports an unknown dataset id plainly", () => {
    expect(backendMismatchMessage("ckan", "nope")).toBe("Unknown datasetId: nope");
  });
});
