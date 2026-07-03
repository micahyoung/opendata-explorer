import type { Feature, FeatureCollection, Point } from "geojson";
import { FETCH_TIMEOUT_MS } from "../../config/constants";
import type { DatasetDefinition } from "../../config/datasets";
import { SocrataHttpError, TimeoutError } from "../utils/errors";

/**
 * Fetches a Socrata URL built by buildSoqlUrl.ts and normalizes the response
 * into a GeoJSON FeatureCollection. Datasets without a native Location column
 * (geo.mode === "latlon") come back as a plain JSON row array and are
 * converted client-side from their lat/lon fields.
 */
export async function fetchSocrata(dataset: DatasetDefinition, url: string): Promise<FeatureCollection> {
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
    return (await response.json()) as FeatureCollection;
  }

  const rows = (await response.json()) as Record<string, string>[];
  return rowsToFeatureCollection(rows, dataset.geo.latField, dataset.geo.lonField);
}

function rowsToFeatureCollection(rows: Record<string, string>[], latField: string, lonField: string): FeatureCollection {
  const features: Feature<Point>[] = [];
  for (const row of rows) {
    const lat = Number(row[latField]);
    const lon = Number(row[lonField]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const { [latField]: _lat, [lonField]: _lon, ...properties } = row;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties,
    });
  }
  return { type: "FeatureCollection", features };
}
