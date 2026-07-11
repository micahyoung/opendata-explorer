#!/usr/bin/env node
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    q: { type: "string" },
    backend: { type: "string", default: "both" },
    limit: { type: "string", default: "20" },
    "timeout-ms": { type: "string", default: "15000" },
  },
});

const query = values.q;
const backend = values.backend;
const timeoutMs = Number.parseInt(values["timeout-ms"], 10);
const MAX_LIMIT = 50;
const limit = Math.min(Number.parseInt(values.limit, 10) || 20, MAX_LIMIT);
const MAX_SERVICES_TO_ENUMERATE = 10;

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!query) {
  fail("--q is required");
}
if (backend !== "arcgis" && backend !== "socrata" && backend !== "both") {
  fail(`--backend must be "arcgis", "socrata", or "both" (got: ${backend})`);
}

async function fetchJson(url, timeoutOverrideMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutOverrideMs ?? timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function emit(result) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

// Mirrors check_candidate.mjs's looksLikeGeoColumn, but the catalog API reports
// column datatypes capitalized ("Point", "Number") where the views API (used by
// check_candidate.mjs) reports them lowercase ("point", "number") — this is the
// same underlying classification, just re-cased for a different Socrata endpoint.
function looksLikeGeoColumnFromCatalog(fieldName, dataType) {
  const name = (fieldName ?? "").toLowerCase();
  const type = (dataType ?? "").toLowerCase();
  if (type === "location" || type === "point") {
    return { kind: "native", name };
  }
  if (type === "number" && /(^|_)(lat|latitude)($|_)/.test(name)) {
    return { kind: "lat", name };
  }
  if (type === "number" && /(^|_)(lon|lng|longitude)($|_)/.test(name)) {
    return { kind: "lon", name };
  }
  return null;
}

async function searchSocrata(q, limit) {
  const url = `https://api.us.socrata.com/api/catalog/v1?q=${encodeURIComponent(q)}&only=datasets&limit=${limit}`;
  const body = await fetchJson(url);
  const rawResults = body.results ?? [];

  return rawResults.map((r) => {
    const resource = r.resource ?? {};
    const fieldNames = resource.columns_field_name ?? [];
    const dataTypes = resource.columns_datatype ?? [];
    const geoMatches = fieldNames.map((f, i) => looksLikeGeoColumnFromCatalog(f, dataTypes[i])).filter(Boolean);

    return {
      backend: "socrata",
      name: resource.name ?? null,
      description: resource.description ?? null,
      domain: r.metadata?.domain ?? null,
      id: resource.id ?? null,
      geo: {
        hasNative: geoMatches.some((m) => m.kind === "native"),
        hasLatLon: geoMatches.some((m) => m.kind === "lat") && geoMatches.some((m) => m.kind === "lon"),
      },
      lastUpdated: resource.updatedAt ?? resource.data_updated_at ?? null,
    };
  });
}

async function searchArcgis(q, limit) {
  const searchUrl = `https://www.arcgis.com/sharing/rest/search?q=${encodeURIComponent(q)}&f=json&num=${limit}&filter=${encodeURIComponent('type:"Feature Service"')}`;
  const body = await fetchJson(searchUrl);
  if (body.error) {
    throw new Error(`ArcGIS search error: ${JSON.stringify(body.error)}`);
  }

  const items = (body.results ?? []).filter(
    (r) => r.type === "Feature Service" && typeof r.url === "string" && r.url.length > 0,
  );

  // Dedupe distinct service roots — a search can surface the same service under
  // multiple item entries.
  const serviceItems = new Map();
  for (const item of items) {
    if (!serviceItems.has(item.url)) serviceItems.set(item.url, item);
  }

  const allServiceUrls = [...serviceItems.keys()];
  const enumerable = allServiceUrls.slice(0, MAX_SERVICES_TO_ENUMERATE);
  const skipped = allServiceUrls.length - enumerable.length;

  const warnings = [];
  const results = [];

  await Promise.all(
    enumerable.map(async (serviceUrl) => {
      const item = serviceItems.get(serviceUrl);
      let serviceMeta;
      try {
        serviceMeta = await fetchJson(`${serviceUrl.replace(/\/+$/, "")}?f=json`);
      } catch (err) {
        warnings.push(`could not enumerate layers for ${serviceUrl}: ${err.message ?? String(err)}`);
        return;
      }
      if (serviceMeta.error) {
        warnings.push(`could not enumerate layers for ${serviceUrl}: ${JSON.stringify(serviceMeta.error)}`);
        return;
      }

      const layers = serviceMeta.layers ?? [];
      for (const layer of layers) {
        if (layer.geometryType !== "esriGeometryPoint") continue;
        results.push({
          backend: "arcgis",
          name: item.title ?? null,
          description: item.snippet ?? null,
          owner: item.owner ?? null,
          url: `${serviceUrl.replace(/\/+$/, "")}/${layer.id}`,
          serviceUrl,
          layerName: layer.name ?? null,
          geometryType: layer.geometryType,
          geo: null,
          lastUpdated: typeof item.modified === "number" ? new Date(item.modified).toISOString() : null,
        });
      }
    }),
  );

  return { results, skipped, warnings };
}

function rankResults(results) {
  return [...results].sort((a, b) => {
    const aViable = a.backend === "arcgis" || a.geo?.hasNative || a.geo?.hasLatLon;
    const bViable = b.backend === "arcgis" || b.geo?.hasNative || b.geo?.hasLatLon;
    if (aViable !== bViable) return aViable ? -1 : 1;

    const aDate = a.lastUpdated ? new Date(a.lastUpdated).getTime() : -Infinity;
    const bDate = b.lastUpdated ? new Date(b.lastUpdated).getTime() : -Infinity;
    return bDate - aDate;
  });
}

async function run() {
  const warnings = [];
  let socrataResults = [];
  let arcgisResults = [];
  let arcgisServicesSkipped = 0;

  const wantSocrata = backend === "socrata" || backend === "both";
  const wantArcgis = backend === "arcgis" || backend === "both";

  const tasks = [];
  if (wantSocrata) {
    tasks.push(
      searchSocrata(query, limit)
        .then((r) => {
          socrataResults = r;
        })
        .catch((err) => {
          warnings.push(`socrata search failed: ${err.message ?? String(err)}`);
        }),
    );
  }
  if (wantArcgis) {
    tasks.push(
      searchArcgis(query, limit)
        .then(({ results, skipped, warnings: arcgisWarnings }) => {
          arcgisResults = results;
          arcgisServicesSkipped = skipped;
          warnings.push(...arcgisWarnings);
        })
        .catch((err) => {
          warnings.push(`arcgis search failed: ${err.message ?? String(err)}`);
        }),
    );
  }

  await Promise.allSettled(tasks);

  const requestedBackends = wantSocrata && wantArcgis ? 2 : 1;
  const failedBackends = warnings.filter((w) => w.startsWith("socrata search failed") || w.startsWith("arcgis search failed")).length;
  if (failedBackends >= requestedBackends) {
    fail(`Execution failure: all requested backend(s) failed — ${warnings.join("; ")}`);
  }

  const results = rankResults([...socrataResults, ...arcgisResults]);

  emit({
    query,
    backend,
    results,
    counts: { socrata: socrataResults.length, arcgis: arcgisResults.length, total: results.length },
    arcgisServicesSkipped,
    warnings,
  });
}

try {
  await run();
} catch (err) {
  fail(`Execution failure: ${err.message ?? String(err)}`);
}
