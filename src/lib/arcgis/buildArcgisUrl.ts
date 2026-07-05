import { ARCGIS_MAX_RECORD_COUNT, DEFAULT_LIMIT } from "../../config/constants";
import type { ArcgisDatasetDefinition } from "../../config/datasets";
import type { ArcgisQueryParams } from "../../types/arcgisTool";

/**
 * Builds the ArcGIS FeatureServer query URL for a validated query. This is
 * the single authoritative place where resultRecordCount is clamped and
 * f=geojson/outSR=4326 are forced, so no caller can bypass them.
 */
export function buildArcgisUrl(dataset: ArcgisDatasetDefinition, params: ArcgisQueryParams): string {
  const clampedRecordCount = Math.min(params.resultRecordCount ?? DEFAULT_LIMIT, ARCGIS_MAX_RECORD_COUNT);

  const url = new URL(`${dataset.featureServerUrl}/query`);
  url.searchParams.set("where", params.where ?? "1=1");
  url.searchParams.set("outFields", params.outFields ?? "*");
  url.searchParams.set("f", "geojson");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("resultRecordCount", String(clampedRecordCount));
  if (params.orderByFields) url.searchParams.set("orderByFields", params.orderByFields);

  return url.toString();
}
