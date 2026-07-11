#!/usr/bin/env node
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    backend: { type: "string" },
    url: { type: "string" },
    domain: { type: "string" },
    id: { type: "string" },
    "portal-url": { type: "string" },
    "resource-id": { type: "string" },
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

if (backend !== "arcgis" && backend !== "socrata" && backend !== "ckan") {
  fail(`--backend must be "arcgis", "socrata", or "ckan" (got: ${backend})`);
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

// CKAN datastore field types (text, numeric, int4, float8, ...) don't reliably
// signal "this is a geo column" the way Socrata's views API does (Boston's own
// lat/lon fields are typed "text"), so classification here is name-only; actual
// populated-ness is confirmed later by parsing sampled values as numbers.
function looksLikeCkanGeoField(field) {
  const name = (field.id ?? "").toLowerCase();
  const type = (field.type ?? "").toLowerCase();
  if (type === "geometry" || name === "geometry" || name === "location" || name === "the_geom") {
    return { kind: "native", name };
  }
  if (/(^|_)(lat|latitude)($|_)/.test(name)) {
    return { kind: "lat", name };
  }
  if (/(^|_)(lon|lng|longitude)($|_)/.test(name)) {
    return { kind: "lon", name };
  }
  return null;
}

async function checkCkan(portalUrl, resourceId) {
  const reasons = [];
  const stats = {};

  const searchUrl = `${portalUrl}/api/3/action/datastore_search?resource_id=${encodeURIComponent(resourceId)}&limit=${sampleSize}`;
  const { body, elapsedMs } = await fetchJson(searchUrl);
  stats.queryLatencyMs = elapsedMs;

  if (!body.success || !body.result) {
    fail(`CKAN datastore_search error for ${portalUrl} / ${resourceId}: ${body.error?.message ?? "unknown error"}`);
  }

  const rowCount = body.result.total ?? 0;
  stats.rowCount = rowCount;
  if (rowCount === 0) {
    reasons.push("row count is 0");
  }

  const fields = body.result.fields ?? [];
  const geoMatches = fields.map(looksLikeCkanGeoField).filter(Boolean);
  const hasNativeGeo = geoMatches.some((m) => m.kind === "native");
  const hasLatLonPair = geoMatches.some((m) => m.kind === "lat") && geoMatches.some((m) => m.kind === "lon");
  stats.geoFields = geoMatches;

  if (!hasLatLonPair) {
    if (hasNativeGeo) {
      reasons.push(
        "CKAN native geometry field found but not supported by the fetch layer (geo.mode 'native' is unimplemented) — a separate lat/lon field pair is required",
      );
    } else {
      reasons.push("no separate lat/lon field pair found (CKAN native geometry is also unsupported by the fetch layer)");
    }
  }

  const records = body.result.records ?? [];
  const latField = geoMatches.find((m) => m.kind === "lat")?.name;
  const lonField = geoMatches.find((m) => m.kind === "lon")?.name;
  let sampleFillRate = 0;
  if (hasLatLonPair && records.length > 0) {
    const withCoords = records.filter((r) => {
      const lat = Number.parseFloat(r[latField]);
      const lon = Number.parseFloat(r[lonField]);
      return Number.isFinite(lat) && Number.isFinite(lon);
    }).length;
    sampleFillRate = withCoords / records.length;
  }
  stats.sampleFillRate = Number(sampleFillRate.toFixed(4));
  stats.sampleSize = records.length;

  if (hasLatLonPair && sampleFillRate < FILL_RATE_THRESHOLD) {
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
    backend: "ckan",
    portalUrl,
    resourceId,
    verdict: reasons.length === 0 ? "qualifies" : "disqualified",
    reasons,
    stats,
  };
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

  const { elapsedMs } = await fetchJson(`https://${domain}/resource/${id}.json?$limit=${sampleSize}`);
  stats.queryLatencyMs = elapsedMs;

  const latField = geoMatches.find((m) => m.kind === "lat")?.name;
  const lonField = geoMatches.find((m) => m.kind === "lon")?.name;
  const nativeField = geoMatches.find((m) => m.kind === "native")?.name;

  // Fill rate is computed via an exact aggregate COUNT over the whole table, not a
  // $limit sample — Socrata's default row order is unspecified/insertion-order, which
  // skews samples for large datasets (e.g. older, worse-geocoded rows sorted first).
  const countWhereNotNull = async (whereClause) => {
    const { body } = await fetchJson(
      `https://${domain}/resource/${id}.json?$select=count(*)&$where=${encodeURIComponent(whereClause)}`,
    );
    return Number.parseInt(body[0]?.count ?? "0", 10);
  };

  // Fill rates are reported per strategy (not OR'd together) because the app config
  // commits to exactly one field at a time (geo.mode "native" xor "latlon") — a
  // populated lat/lon pair doesn't help if the config points at an empty native column.
  const nativeFillRate = hasNativeGeo
    ? Number((await countWhereNotNull(`${nativeField} IS NOT NULL`) / rowCount).toFixed(4))
    : null;
  const latLonFillRate = hasLatLonPair
    ? Number((await countWhereNotNull(`${latField} IS NOT NULL AND ${lonField} IS NOT NULL`) / rowCount).toFixed(4))
    : null;
  stats.nativeFillRate = nativeFillRate;
  stats.latLonFillRate = latLonFillRate;

  const fillRate = Math.max(nativeFillRate ?? 0, latLonFillRate ?? 0);
  stats.fillRate = Number(fillRate.toFixed(4));

  // Informational only — a strategy scoring below the bar doesn't block the verdict
  // as long as at least one strategy (native OR lat/lon) does. It's still surfaced
  // so the config author knows which specific field to point geo.mode at.
  if (hasNativeGeo && nativeFillRate < FILL_RATE_THRESHOLD) {
    stats.notes = [
      ...(stats.notes ?? []),
      `native column "${nativeField}" populated-coordinate rate ${(nativeFillRate * 100).toFixed(1)}% is below ${FILL_RATE_THRESHOLD * 100}% threshold — do not use geo.mode "native" for this dataset`,
    ];
  }
  if (hasLatLonPair && latLonFillRate < FILL_RATE_THRESHOLD) {
    stats.notes = [
      ...(stats.notes ?? []),
      `lat/lon columns "${latField}"/"${lonField}" populated-coordinate rate ${(latLonFillRate * 100).toFixed(1)}% is below ${FILL_RATE_THRESHOLD * 100}% threshold — do not use geo.mode "latlon" for this dataset`,
    ];
  }
  if ((hasNativeGeo || hasLatLonPair) && fillRate < FILL_RATE_THRESHOLD) {
    reasons.push(`no geo strategy meets the ${FILL_RATE_THRESHOLD * 100}% populated-coordinate threshold (most rows ungeocoded)`);
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
  } else if (backend === "ckan") {
    if (!values["portal-url"] || !values["resource-id"]) {
      fail("--portal-url and --resource-id are required for --backend ckan");
    }
    emit(await checkCkan(values["portal-url"].replace(/\/+$/, ""), values["resource-id"]));
  } else {
    if (!values.domain || !values.id) fail("--domain and --id are required for --backend socrata");
    emit(await checkSocrata(values.domain, values.id));
  }
} catch (err) {
  fail(`Execution failure: ${err.message ?? String(err)}`);
}
