import type { Feature, FeatureCollection } from "geojson";
import { FETCH_TIMEOUT_MS } from "../../config/constants";
import type { SocrataDatasetDefinition } from "../../config/datasets";
import { SocrataHttpError, TimeoutError } from "../utils/errors";
import { isNullIsland } from "../utils/isNullIsland";
import { rowsToFeatureCollection } from "../utils/rowsToFeatureCollection";

/**
 * Fetches a Socrata URL built by buildSoqlUrl.ts and normalizes the response
 * into a GeoJSON FeatureCollection. Datasets without a native Location column
 * (geo.mode === "latlon") come back as a plain JSON row array and are
 * converted client-side from their lat/lon fields.
 */
export async function fetchSocrata(dataset: SocrataDatasetDefinition, url: string): Promise<FeatureCollection> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TimeoutError(`Socrata request timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => undefined);
    throw new SocrataHttpError(`Socrata request failed with status ${response.status}`, response.status, body);
  }

  if (dataset.geo.mode === "native") {
    const collection = (await response.json()) as FeatureCollection;
    return {
      ...collection,
      features: collection.features.filter((feature) => !isNullIslandFeature(feature)),
    };
  }

  const rows = (await response.json()) as Record<string, string>[];
  return rowsToFeatureCollection(rows, dataset.geo.latField, dataset.geo.lonField);
}

function isNullIslandFeature(feature: Feature): boolean {
  if (feature.geometry?.type !== "Point") return false;
  const [lon, lat] = feature.geometry.coordinates;
  return isNullIsland(lat, lon);
}
