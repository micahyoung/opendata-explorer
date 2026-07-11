import type { FeatureCollection } from "geojson";
import { FETCH_TIMEOUT_MS } from "../../config/constants";
import type { CkanDatasetDefinition } from "../../config/datasets";
import { CkanHttpError, TimeoutError } from "../utils/errors";
import { rowsToFeatureCollection } from "../utils/rowsToFeatureCollection";

interface CkanSearchResponse {
  success: boolean;
  error?: { message?: string };
  result?: { records: Record<string, unknown>[] };
}

/**
 * Fetches a URL built by buildDatastoreSearchUrl.ts and normalizes the
 * response into a GeoJSON FeatureCollection. CKAN's datastore_search can
 * return HTTP 200 with an embedded {"success": false, "error": {...}} body
 * instead of a non-2xx status, so that case is checked explicitly, mirroring
 * fetchArcgis.ts's handling of ArcGIS's equivalent quirk. Rows always come
 * back as a plain JSON array with separate lat/lon fields — there's no CKAN
 * equivalent of Socrata's native-geometry mode.
 */
export async function fetchCkan(dataset: CkanDatasetDefinition, url: string): Promise<FeatureCollection> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TimeoutError(`CKAN request timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => undefined);
    throw new CkanHttpError(`CKAN request failed with status ${response.status}`, response.status, body);
  }

  const body = (await response.json()) as CkanSearchResponse;
  if (!body.success || !body.result) {
    throw new CkanHttpError(`CKAN rejected the query: ${body.error?.message ?? "unknown error"}`, 400);
  }

  if (dataset.geo.mode === "native") {
    throw new CkanHttpError("CKAN datasets with geo.mode 'native' are not yet supported by the fetch layer", 500);
  }

  return rowsToFeatureCollection(body.result.records, dataset.geo.latField, dataset.geo.lonField);
}
