import { CKAN_MAX_LIMIT, DEFAULT_LIMIT } from "../../config/constants";
import type { CkanDatasetDefinition } from "../../config/datasets";
import type { CkanQueryParams } from "../../types/ckanTool";

/**
 * Builds the CKAN datastore_search request URL for a validated query. This
 * is the single authoritative place where `limit` is clamped, so no caller
 * (LLM-driven or otherwise) can bypass it. datastore_search always returns
 * every field, so unlike Socrata there's no select/geo-field injection to do.
 */
export function buildDatastoreSearchUrl(dataset: CkanDatasetDefinition, params: CkanQueryParams): string {
  const clampedLimit = Math.min(params.limit ?? DEFAULT_LIMIT, CKAN_MAX_LIMIT);

  const url = new URL(`${dataset.portalUrl}/api/3/action/datastore_search`);
  url.searchParams.set("resource_id", dataset.resourceId);
  url.searchParams.set("limit", String(clampedLimit));
  if (params.filters && Object.keys(params.filters).length > 0) {
    url.searchParams.set("filters", JSON.stringify(params.filters));
  }
  if (params.q) url.searchParams.set("q", params.q);
  if (params.sort) url.searchParams.set("sort", params.sort);

  return url.toString();
}
