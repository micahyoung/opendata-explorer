import { FETCH_TIMEOUT_MS } from "../../config/constants";
import type { GeocodeResult } from "../../types/geocodeTool";
import { NominatimHttpError, TimeoutError } from "../utils/errors";

// A bare point/POI result gets padded up to roughly this floor
// (~1.5 NYC blocks) so a bounding-box query downstream has something to match.
const MIN_HALF_SPAN_LAT = 0.0015;
const MIN_HALF_SPAN_LON = 0.002;

interface NominatimResponseItem {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string];
}

export async function fetchNominatim(query: string): Promise<GeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1&countrycodes=us`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TimeoutError(`Nominatim request timed out after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => undefined);
    throw new NominatimHttpError(`Nominatim request failed with status ${response.status}`, response.status, body);
  }

  const results = (await response.json()) as NominatimResponseItem[];

  if (results.length === 0) {
    return {
      success: false,
      query,
      error: { kind: "notFound", message: `No match for '${query}'. Try a more specific address or landmark.` },
    };
  }

  const [minLatRaw, maxLatRaw, minLonRaw, maxLonRaw] = results[0].boundingbox;
  const lat = Number(results[0].lat);
  const lon = Number(results[0].lon);
  let minLat = Number(minLatRaw);
  let maxLat = Number(maxLatRaw);
  let minLon = Number(minLonRaw);
  let maxLon = Number(maxLonRaw);

  if (maxLat - minLat < MIN_HALF_SPAN_LAT * 2) {
    minLat = lat - MIN_HALF_SPAN_LAT;
    maxLat = lat + MIN_HALF_SPAN_LAT;
  }
  if (maxLon - minLon < MIN_HALF_SPAN_LON * 2) {
    minLon = lon - MIN_HALF_SPAN_LON;
    maxLon = lon + MIN_HALF_SPAN_LON;
  }

  return {
    success: true,
    query,
    displayName: results[0].display_name,
    lat,
    lon,
    boundingBox: { minLat, maxLat, minLon, maxLon },
  };
}
