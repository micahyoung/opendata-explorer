import { DEFAULT_LIMIT, SOCRATA_MAX_LIMIT } from "../../config/constants";
import type { SocrataDatasetDefinition } from "../../config/datasets";
import type { SocrataQueryParams } from "../../types/socrataTool";

/**
 * Builds the Socrata request URL for a validated query. This is the single
 * authoritative place where `$limit` is clamped and the geo field/endpoint
 * suffix are forced, so no caller (LLM-driven or otherwise) can bypass them.
 */
export function buildSoqlUrl(dataset: SocrataDatasetDefinition, params: SocrataQueryParams, appToken?: string): string {
  const clampedLimit = Math.min(params.limit ?? DEFAULT_LIMIT, SOCRATA_MAX_LIMIT);

  const endpointSuffix = dataset.geo.mode === "native" ? "geojson" : "json";
  const url = new URL(`https://${dataset.domain}/resource/${dataset.id}.${endpointSuffix}`);

  const select = buildSelect(dataset, params.select);
  if (select) url.searchParams.set("$select", select);
  if (params.where) url.searchParams.set("$where", params.where);
  if (params.order) url.searchParams.set("$order", params.order);
  url.searchParams.set("$limit", String(clampedLimit));
  if (appToken) url.searchParams.set("$$app_token", appToken);

  return url.toString();
}

function buildSelect(dataset: SocrataDatasetDefinition, requestedSelect?: string): string | undefined {
  if (!requestedSelect) return undefined;
  if (requestedSelect.trim() === "*") return undefined; // "*" already selects every column, including geo fields

  const requestedFields = requestedSelect.split(",").map((f) => f.trim().toLowerCase());
  const missingGeoFields = requiredGeoFields(dataset).filter(
    (f) => !requestedFields.includes(f.toLowerCase())
  );
  if (missingGeoFields.length === 0) return requestedSelect;
  return [requestedSelect, ...missingGeoFields].join(", ");
}

function requiredGeoFields(dataset: SocrataDatasetDefinition): string[] {
  return dataset.geo.mode === "native" ? [dataset.geo.field] : [dataset.geo.latField, dataset.geo.lonField];
}
