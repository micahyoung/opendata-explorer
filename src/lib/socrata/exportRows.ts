import type { Feature } from "geojson";
import type { DatasetDefinition } from "../../config/datasets";

export function pickCsvColumns(dataset: DatasetDefinition): string[] {
  if (dataset.backend === "arcgis") return dataset.fields.map((f) => f.name);
  const geoFieldNames = dataset.geo.mode === "native" ? [dataset.geo.field] : [dataset.geo.latField, dataset.geo.lonField];
  return dataset.fields.map((f) => f.name).filter((name) => !geoFieldNames.includes(name));
}

export function featureToRow(feature: Feature, columns: string[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const column of columns) {
    if (column === "lat" || column === "lon") continue;
    row[column] = feature.properties?.[column] ?? "";
  }

  if (feature.geometry?.type === "Point") {
    const [lon, lat] = feature.geometry.coordinates;
    row.lat = lat;
    row.lon = lon;
  } else {
    row.lat = "";
    row.lon = "";
  }

  return row;
}

function csvEscape(value: unknown): string {
  const str = value === undefined || value === null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const header = [...columns.filter((c) => c !== "lat" && c !== "lon"), "lat", "lon"];
  const lines = [header.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(header.map((col) => csvEscape(row[col])).join(","));
  }
  return lines.join("\n");
}
