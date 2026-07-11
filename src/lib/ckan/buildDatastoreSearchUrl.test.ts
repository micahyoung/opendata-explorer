import { describe, expect, it } from "vitest";
import type { CkanDatasetDefinition } from "../../config/datasets/datasets.schema";
import type { CkanQueryParams } from "../../types/ckanTool";
import { buildDatastoreSearchUrl } from "./buildDatastoreSearchUrl";
import { CKAN_MAX_LIMIT } from "../../config/constants";

function makeDataset(): CkanDatasetDefinition {
  return {
    backend: "ckan",
    id: "test-ckan",
    portalUrl: "https://example.com",
    resourceId: "abc-123",
    name: "Test CKAN Dataset",
    description: "A dataset for tests",
    geo: { mode: "latlon", latField: "latitude", lonField: "longitude" },
    fields: [{ name: "case_topic", type: "text", description: "" }],
    exemplars: [{ question: "test", query: {} }],
    mapColor: "#000000",
    categoryField: "case_topic",
  };
}

function makeParams(overrides: Partial<CkanQueryParams> = {}): CkanQueryParams {
  return { datasetId: "test-ckan", ...overrides };
}

describe("buildDatastoreSearchUrl", () => {
  it("sets resource_id and defaults limit", () => {
    const url = new URL(buildDatastoreSearchUrl(makeDataset(), makeParams()));
    expect(url.pathname).toBe("/api/3/action/datastore_search");
    expect(url.searchParams.get("resource_id")).toBe("abc-123");
    expect(url.searchParams.get("limit")).toBe("1000");
  });

  it("clamps limit to CKAN_MAX_LIMIT", () => {
    const url = new URL(buildDatastoreSearchUrl(makeDataset(), makeParams({ limit: 999_999 })));
    expect(url.searchParams.get("limit")).toBe(String(CKAN_MAX_LIMIT));
  });

  it("serializes filters as a JSON string", () => {
    const url = new URL(
      buildDatastoreSearchUrl(makeDataset(), makeParams({ filters: { case_status: "Open", neighborhood: "Jamaica Plain" } }))
    );
    expect(JSON.parse(url.searchParams.get("filters")!)).toEqual({ case_status: "Open", neighborhood: "Jamaica Plain" });
  });

  it("omits filters param when filters is empty or absent", () => {
    const url = new URL(buildDatastoreSearchUrl(makeDataset(), makeParams({ filters: {} })));
    expect(url.searchParams.has("filters")).toBe(false);
  });

  it("passes through q and sort when present", () => {
    const url = new URL(buildDatastoreSearchUrl(makeDataset(), makeParams({ q: "graffiti", sort: "open_date desc" })));
    expect(url.searchParams.get("q")).toBe("graffiti");
    expect(url.searchParams.get("sort")).toBe("open_date desc");
  });

  it("omits q and sort when absent", () => {
    const url = new URL(buildDatastoreSearchUrl(makeDataset(), makeParams()));
    expect(url.searchParams.has("q")).toBe(false);
    expect(url.searchParams.has("sort")).toBe(false);
  });
});
