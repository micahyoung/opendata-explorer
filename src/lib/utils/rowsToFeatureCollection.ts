import type { Feature, FeatureCollection, Point } from "geojson";

// Some backends (Socrata's "latlon" geo mode, CKAN's DataStore) return plain
// JSON rows with separate lat/lon fields rather than native GeoJSON. Rows
// sometimes carry a failed-geocode sentinel of (0, 0) — "Null Island" —
// rather than a null geometry. Both are normalized here so callers get a
// clean FeatureCollection.
function isNullIsland(lat: number, lon: number): boolean {
  return lat === 0 && lon === 0;
}

export function rowsToFeatureCollection(
  rows: Record<string, unknown>[],
  latField: string,
  lonField: string
): FeatureCollection {
  const features: Feature<Point>[] = [];
  for (const row of rows) {
    const lat = Number(row[latField]);
    const lon = Number(row[lonField]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (isNullIsland(lat, lon)) continue;

    const { [latField]: _lat, [lonField]: _lon, ...properties } = row;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties,
    });
  }
  return { type: "FeatureCollection", features };
}
