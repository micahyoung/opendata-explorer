import { describe, expect, it } from "vitest";
import { datasets } from "../src/config/datasets";
import { buildSoqlUrl } from "../src/lib/socrata/buildSoqlUrl";
import { fetchSocrata } from "../src/lib/socrata/fetchSocrata";

/**
 * Live smoke test: runs every dataset's hand-written exemplar SoQL against
 * the real Socrata endpoint. Not a snapshot test — only asserts each query
 * is still well-formed and returns at least one feature, catching upstream
 * renames/retirements of datasets or columns.
 */
describe("dataset exemplars (live)", () => {
  for (const dataset of datasets) {
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
  }
});
