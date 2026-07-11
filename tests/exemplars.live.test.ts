import { describe, expect, it } from "vitest";
import { datasets } from "../src/config/datasets";
import { buildArcgisUrl } from "../src/lib/arcgis/buildArcgisUrl";
import { fetchArcgis } from "../src/lib/arcgis/fetchArcgis";
import { buildDatastoreSearchUrl } from "../src/lib/ckan/buildDatastoreSearchUrl";
import { fetchCkan } from "../src/lib/ckan/fetchCkan";
import { buildSoqlUrl } from "../src/lib/socrata/buildSoqlUrl";
import { fetchSocrata } from "../src/lib/socrata/fetchSocrata";

/**
 * Live smoke test: runs every dataset's hand-written exemplar query against
 * the real backend (Socrata, ArcGIS, or CKAN). Not a snapshot test — only
 * asserts each query is still well-formed and returns at least one feature,
 * catching upstream renames/retirements of datasets or columns.
 */
describe("dataset exemplars (live)", () => {
  for (const dataset of datasets) {
    if (dataset.backend === "socrata") {
      for (const exemplar of dataset.exemplars) {
        it(
          `${dataset.id}: "${exemplar.question}"`,
          async () => {
            const url = buildSoqlUrl(dataset, { datasetId: dataset.id, ...exemplar.soql });
            const fc = await fetchSocrata(dataset, url);
            expect(fc.type).toBe("FeatureCollection");
            expect(fc.features.length).toBeGreaterThan(0);
          },
          20_000
        );
      }
    } else if (dataset.backend === "arcgis") {
      for (const exemplar of dataset.exemplars) {
        it(
          `${dataset.id}: "${exemplar.question}"`,
          async () => {
            const url = buildArcgisUrl(dataset, { datasetId: dataset.id, ...exemplar.query });
            const fc = await fetchArcgis(url);
            expect(fc.type).toBe("FeatureCollection");
            expect(fc.features.length).toBeGreaterThan(0);
          },
          20_000
        );
      }
    } else {
      for (const exemplar of dataset.exemplars) {
        it(
          `${dataset.id}: "${exemplar.question}"`,
          async () => {
            const url = buildDatastoreSearchUrl(dataset, { datasetId: dataset.id, ...exemplar.query });
            const fc = await fetchCkan(dataset, url);
            expect(fc.type).toBe("FeatureCollection");
            expect(fc.features.length).toBeGreaterThan(0);
          },
          20_000
        );
      }
    }
  }
});
