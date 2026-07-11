#!/usr/bin/env node
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    q: { type: "string" },
    backend: { type: "string", default: "both" },
    portal: { type: "string" },
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
const MAX_RESOURCES_TO_ENUMERATE = 10;

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!query) {
  fail("--q is required");
}
if (backend !== "arcgis" && backend !== "socrata" && backend !== "both" && backend !== "ckan") {
  fail(`--backend must be "arcgis", "socrata", "ckan", or "both" (got: ${backend})`);
}
// Unlike Socrata/ArcGIS, CKAN has no single global catalog to search — "both"
// only ever means socrata+arcgis, and a ckan search always targets one portal.
if (backend === "ckan" && !values.portal) {
  fail('--portal is required for --backend ckan (e.g. --portal "https://data.boston.gov")');
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

// Mirrors check_candidate.mjs's looksLikeCkanGeoField — CKAN datastore field
// types (text, numeric, ...) don't reliably signal a geo column, so this is
// name-only classification.
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

async function searchCkan(portalUrl, q, limit) {
  const searchUrl = `${portalUrl}/api/3/action/package_search?q=${encodeURIComponent(q)}&rows=${limit}`;
  const body = await fetchJson(searchUrl);
  if (!body.success || !body.result) {
    throw new Error(`CKAN package_search error: ${body.error?.message ?? "unknown error"}`);
  }

  const candidates = [];
  for (const pkg of body.result.results ?? []) {
    for (const resource of pkg.resources ?? []) {
      if (resource.datastore_active) {
        candidates.push({ pkg, resource });
      }
    }
  }

  const enumerable = candidates.slice(0, MAX_RESOURCES_TO_ENUMERATE);
  const skipped = candidates.length - enumerable.length;
  const warnings = [];
  const results = [];

  await Promise.all(
    enumerable.map(async ({ pkg, resource }) => {
      let dsBody;
      try {
        dsBody = await fetchJson(
          `${portalUrl}/api/3/action/datastore_search?resource_id=${encodeURIComponent(resource.id)}&limit=1`,
        );
      } catch (err) {
        warnings.push(`could not inspect fields for resource ${resource.id}: ${err.message ?? String(err)}`);
        return;
      }
      if (!dsBody.success || !dsBody.result) {
        warnings.push(`could not inspect fields for resource ${resource.id}: ${dsBody.error?.message ?? "unknown error"}`);
        return;
      }

      const geoMatches = (dsBody.result.fields ?? []).map(looksLikeCkanGeoField).filter(Boolean);
      results.push({
        backend: "ckan",
        name: pkg.title ?? null,
        description: pkg.notes ?? null,
        portalUrl,
        resourceId: resource.id,
        resourceName: resource.name ?? null,
        geo: {
          hasNative: geoMatches.some((m) => m.kind === "native"),
          hasLatLon: geoMatches.some((m) => m.kind === "lat") && geoMatches.some((m) => m.kind === "lon"),
        },
        lastUpdated: pkg.metadata_modified ?? null,
      });
    }),
  );

  return { results, skipped, warnings };
}

function rankResults(results) {
  return [...results].sort((a, b) => {
    // CKAN never gets an hasNative-viable pass — the fetch layer only supports
    // its "latlon" geo mode, not native geometry (see fetchCkan.ts).
    const aViable = a.backend === "arcgis" || a.geo?.hasLatLon || (a.backend === "socrata" && a.geo?.hasNative);
    const bViable = b.backend === "arcgis" || b.geo?.hasLatLon || (b.backend === "socrata" && b.geo?.hasNative);
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
  let ckanResults = [];
  let ckanResourcesSkipped = 0;

  const wantSocrata = backend === "socrata" || backend === "both";
  const wantArcgis = backend === "arcgis" || backend === "both";
  // ckan is never implied by "both" — there's no global CKAN catalog, so a
  // search always targets exactly one portal via --portal.
  const wantCkan = backend === "ckan";

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
  if (wantCkan) {
    tasks.push(
      searchCkan(values.portal.replace(/\/+$/, ""), query, limit)
        .then(({ results, skipped, warnings: ckanWarnings }) => {
          ckanResults = results;
          ckanResourcesSkipped = skipped;
          warnings.push(...ckanWarnings);
        })
        .catch((err) => {
          warnings.push(`ckan search failed: ${err.message ?? String(err)}`);
        }),
    );
  }

  await Promise.allSettled(tasks);

  const requestedBackends = [wantSocrata, wantArcgis, wantCkan].filter(Boolean).length;
  const failedBackends = warnings.filter(
    (w) => w.startsWith("socrata search failed") || w.startsWith("arcgis search failed") || w.startsWith("ckan search failed"),
  ).length;
  if (failedBackends >= requestedBackends) {
    fail(`Execution failure: all requested backend(s) failed — ${warnings.join("; ")}`);
  }

  const results = rankResults([...socrataResults, ...arcgisResults, ...ckanResults]);

  emit({
    query,
    backend,
    results,
    counts: { socrata: socrataResults.length, arcgis: arcgisResults.length, ckan: ckanResults.length, total: results.length },
    arcgisServicesSkipped,
    ckanResourcesSkipped,
    warnings,
  });
}

try {
  await run();
} catch (err) {
  fail(`Execution failure: ${err.message ?? String(err)}`);
}
