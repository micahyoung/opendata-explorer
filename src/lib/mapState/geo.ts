import type { FeatureCollection } from "geojson";

export type BBox = [number, number, number, number];

/** Formats a coordinate pair into a stable string key for exact-match grouping/lookup. */
export function coordinateKey(lon: number, lat: number): string {
  return `${lon.toFixed(6)},${lat.toFixed(6)}`;
}

/** Computes a [minLon, minLat, maxLon, maxLat] bbox from a FeatureCollection's point geometries. */
export function computeBBox(fc: FeatureCollection): BBox | undefined {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const feature of fc.features) {
    if (!feature.geometry || feature.geometry.type !== "Point") continue;
    const [lon, lat] = feature.geometry.coordinates;
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }

  if (!Number.isFinite(minLon)) return undefined;
  return [minLon, minLat, maxLon, maxLat];
}
