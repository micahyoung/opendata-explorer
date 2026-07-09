#!/usr/bin/env node
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    backend: { type: "string" },
    url: { type: "string" },
    domain: { type: "string" },
    id: { type: "string" },
    "sample-size": { type: "string", default: "500" },
    "timeout-ms": { type: "string", default: "15000" },
  },
});

const backend = values.backend;
const sampleSize = Number.parseInt(values["sample-size"], 10);
const timeoutMs = Number.parseInt(values["timeout-ms"], 10);
const FILL_RATE_THRESHOLD = 0.9;

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (backend !== "arcgis" && backend !== "socrata") {
  fail(`--backend must be "arcgis" or "socrata" (got: ${backend})`);
}

async function fetchJson(url, timeoutOverrideMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutOverrideMs ?? timeoutMs);
  const start = performance.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const elapsedMs = Math.round(performance.now() - start);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    }
    const body = await res.json();
    return { body, elapsedMs };
  } finally {
    clearTimeout(timeout);
  }
}

function emit(result) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

async function checkArcgis(url) {
  const reasons = [];
  const stats = {};

  const { body: meta } = await fetchJson(`${url}?f=json`);
  if (meta.error) {
    fail(`ArcGIS layer metadata error for ${url}: ${JSON.stringify(meta.error)}`);
  }

  stats.layerType = meta.type ?? null;
  stats.geometryType = meta.geometryType ?? null;

  if (meta.type !== "Feature Layer") {
    reasons.push(`layer type is "${meta.type}", not "Feature Layer" (likely a non-spatial table)`);
  }
  if (meta.geometryType !== "esriGeometryPoint") {
    reasons.push(`geometryType is "${meta.geometryType}", not "esriGeometryPoint" (polygon/line geometry is deferred, not point)`);
  }

  const { body: countBody } = await fetchJson(
    `${url}/query?where=1%3D1&returnCountOnly=true&f=json`,
  );
  const rowCount = countBody.count ?? 0;
  stats.rowCount = rowCount;
  if (rowCount === 0) {
    reasons.push("row count is 0");
  }

  const sampleUrl = `${url}/query?where=1%3D1&resultRecordCount=${sampleSize}&f=geojson&outSR=4326`;
  const { body: sampleBody, elapsedMs } = await fetchJson(sampleUrl);
  stats.queryLatencyMs = elapsedMs;

  const features = sampleBody.features ?? [];
  const withGeometry = features.filter(
    (f) => f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length === 2,
  ).length;
  const sampleFillRate = features.length > 0 ? withGeometry / features.length : 0;
  stats.sampleFillRate = Number(sampleFillRate.toFixed(4));
  stats.sampleSize = features.length;

  if (sampleFillRate < FILL_RATE_THRESHOLD) {
    reasons.push(
      `sample populated-coordinate rate ${(sampleFillRate * 100).toFixed(1)}% is below ${FILL_RATE_THRESHOLD * 100}% threshold (most rows ungeocoded)`,
    );
  }

  if (elapsedMs >= timeoutMs) {
    reasons.push(
      `representative query took ${elapsedMs}ms, at/above --timeout-ms=${timeoutMs} (would exceed the app's hard-coded fetch timeout)`,
    );
  }

  return {
    backend: "arcgis",
    url,
    verdict: reasons.length === 0 ? "qualifies" : "disqualified",
    reasons,
    stats,
  };
}

function looksLikeGeoColumn(column) {
  const name = (column.fieldName ?? column.name ?? "").toLowerCase();
  const dataTypeName = column.dataTypeName ?? "";
  if (dataTypeName === "location" || dataTypeName === "point") {
    return { kind: "native", name, dataTypeName };
  }
  if (dataTypeName === "number" && /(^|_)(lat|latitude)($|_)/.test(name)) {
    return { kind: "lat", name, dataTypeName };
  }
  if (dataTypeName === "number" && /(^|_)(lon|lng|longitude)($|_)/.test(name)) {
    return { kind: "lon", name, dataTypeName };
  }
  return null;
}

async function checkSocrata(domain, id) {
  const reasons = [];
  const stats = {};

  const { body: viewMeta } = await fetchJson(`https://${domain}/api/views/${id}.json`);
  if (viewMeta.error) {
    fail(`Socrata view metadata error for ${domain}/${id}: ${JSON.stringify(viewMeta.error)}`);
  }

  const columns = viewMeta.columns ?? [];
  const geoMatches = columns.map(looksLikeGeoColumn).filter(Boolean);
  const hasNativeGeo = geoMatches.some((m) => m.kind === "native");
  const hasLatLonPair = geoMatches.some((m) => m.kind === "lat") && geoMatches.some((m) => m.kind === "lon");

  stats.geoColumns = geoMatches;

  if (!hasNativeGeo && !hasLatLonPair) {
    reasons.push(
      "no native location/point column and no separate numeric lat/lon column pair found (only a free-text or unrecognized geo encoding, e.g. a serialized \"(lat,lon)\" string, is deferred)",
    );
  }

  const { body: countBody } = await fetchJson(
    `https://${domain}/resource/${id}.json?$select=count(*)`,
  );
  const rowCount = Number.parseInt(countBody[0]?.count ?? "0", 10);
  stats.rowCount = rowCount;
  if (rowCount === 0) {
    reasons.push("row count is 0");
  }

  const sampleUrl = `https://${domain}/resource/${id}.json?$limit=${sampleSize}`;
  const { body: sampleRows, elapsedMs } = await fetchJson(sampleUrl);
  stats.queryLatencyMs = elapsedMs;

  const latField = geoMatches.find((m) => m.kind === "lat")?.name;
  const lonField = geoMatches.find((m) => m.kind === "lon")?.name;
  const nativeField = geoMatches.find((m) => m.kind === "native")?.name;

  const isPopulated = (row) => {
    if (nativeField && row[nativeField] && (row[nativeField].coordinates || (row[nativeField].latitude && row[nativeField].longitude))) {
      return true;
    }
    if (latField && lonField && row[latField] != null && row[lonField] != null) {
      return true;
    }
    return false;
  };

  const rows = Array.isArray(sampleRows) ? sampleRows : [];
  const populated = rows.filter(isPopulated).length;
  const sampleFillRate = rows.length > 0 ? populated / rows.length : 0;
  stats.sampleFillRate = Number(sampleFillRate.toFixed(4));
  stats.sampleSize = rows.length;

  if ((hasNativeGeo || hasLatLonPair) && sampleFillRate < FILL_RATE_THRESHOLD) {
    reasons.push(
      `sample populated-coordinate rate ${(sampleFillRate * 100).toFixed(1)}% is below ${FILL_RATE_THRESHOLD * 100}% threshold (most rows ungeocoded)`,
    );
  }

  if (elapsedMs >= timeoutMs) {
    reasons.push(
      `representative query took ${elapsedMs}ms, at/above --timeout-ms=${timeoutMs} (would exceed the app's hard-coded fetch timeout)`,
    );
  }

  return {
    backend: "socrata",
    domain,
    id,
    verdict: reasons.length === 0 ? "qualifies" : "disqualified",
    reasons,
    stats,
  };
}

try {
  if (backend === "arcgis") {
    if (!values.url) fail("--url is required for --backend arcgis");
    emit(await checkArcgis(values.url.replace(/\/+$/, "")));
  } else {
    if (!values.domain || !values.id) fail("--domain and --id are required for --backend socrata");
    emit(await checkSocrata(values.domain, values.id));
  }
} catch (err) {
  fail(`Execution failure: ${err.message ?? String(err)}`);
}
