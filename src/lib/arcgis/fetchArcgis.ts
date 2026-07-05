import type { FeatureCollection } from "geojson";
import { FETCH_TIMEOUT_MS } from "../../config/constants";
import { ArcgisHttpError, TimeoutError } from "../utils/errors";

interface ArcgisErrorBody {
  error?: { code?: number; message?: string; details?: string[] };
}

/**
 * Fetches a URL built by buildArcgisUrl.ts. ArcGIS FeatureServers can return
 * HTTP 200 with an embedded {"error": {...}} body instead of a non-2xx
 * status, so that case is checked explicitly and also raised as
 * ArcgisHttpError. Responses are already WGS84 GeoJSON (f=geojson&outSR=4326),
 * so no native/latlon branching is needed.
 */
export async function fetchArcgis(url: string): Promise<FeatureCollection> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TimeoutError(`ArcGIS request timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => undefined);
    throw new ArcgisHttpError(`ArcGIS request failed with status ${response.status}`, response.status, body);
  }

  const text = await response.text();
  const parsed = JSON.parse(text) as ArcgisErrorBody | FeatureCollection;

  if ("error" in parsed && parsed.error) {
    throw new ArcgisHttpError(
      `ArcGIS rejected the query: ${parsed.error.message ?? "unknown error"}`,
      parsed.error.code ?? 400,
      parsed.error.details?.join("; ")
    );
  }

  return parsed as FeatureCollection;
}
