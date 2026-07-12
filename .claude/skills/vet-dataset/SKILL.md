---
name: vet-dataset
description: Vet a candidate civic-open-data dataset against this app's catalog qualifying bar. Use for "propose 3 datasets", "check if X dataset would work", "is Y suitable for the catalog", "vet this dataset", "find a dataset for <city>", or naming a candidate city/dataset to add. Always invoke instead of manually curling/WebFetching/greping candidate endpoints by hand.
---

# Vet Dataset

Vets candidate datasets for the curated catalog in two phases: non-deterministic discovery (find the real live endpoint) and deterministic verification (`scripts/check_candidate.mjs`) against the same bar every dataset in `src/config/datasets/` was held to. Before spending discovery/verification effort, a candidate is first checked against what's already curated (`src/config/datasets/*.ts`) and against a persistent ledger of prior durable rejections (`src/config/datasets/rejected.csv`), so the same dataset isn't re-vetted across sessions.

## 1. Parse the request

The argument resolves to one or more natural-language dataset descriptions, which Steps 2–5 (check-existing → discovery → verify → synthesize/record) then process independently — that per-description sequence is the subroutine both request shapes share. The argument comes in one of two shapes:

- **Explicit candidate(s)** — one or more named datasets/cities (e.g. "Boston 311", or a list of several). Use them directly as the descriptions.
- **A propose/suggest instruction** — no specific dataset named (e.g. "propose 3 new datasets", "what should we add next"). First *generate* the candidate descriptions yourself, then treat each exactly like an explicit candidate. To generate them, derive coverage gaps from what's already curated (`src/config/datasets/*.ts` — city × category × backend) minus what's already rejected (`rejected.csv`), and pick descriptions that fill those gaps. Step 2's check-existing then formally confirms each isn't already curated/rejected before any discovery work.

Follow the count and intent the invocation gave — how many, any region/category theme, whether to substitute for candidates that don't pan out — rather than imposing your own defaults or caps.

## 2. Check existing (per description)

Before any discovery work, check the description against what's already curated and what's already been rejected — this is what stops the same dataset from being re-vetted across sessions:

```
grep -il "<candidate name/tokens>" src/config/datasets/*.ts src/config/datasets/rejected.csv
```

- Match against an accepted `*.ts` config → **hard-skip** this candidate, report *"already curated"*, and move on.
- Match a `rejected.csv` row → **hard-skip**, report *"already rejected (durable): <reason from the ledger>"*, and move on.
- Only candidates with **no** match proceed to Discovery.

`rejected.csv` records **durable** rejections only (`Proposed Dataset,Reason,Identifier`), so a hard-skip never wrongly buries a merely-transient failure — those were deliberately left out of the ledger to be re-vetted (see Step 5). Because the name-only grep can miss federated/renamed datasets, re-run this check on the **resolved identifier** the moment Discovery surfaces a real URL / `domain+id` — grep `rejected.csv` and `*.ts` for that identifier before spending any Verify effort.

## 3. Discovery (per description)

Start with the catalog search script for a fast, deterministic first pass; fall back to WebSearch/WebFetch/curl when it returns nothing or only weak matches:

```
node .claude/skills/vet-dataset/scripts/search_catalog.mjs --q "<description>" --backend both
```

This is a first-pass aid, not a full replacement for web search — self-hosted ArcGIS Server instances not registered as ArcGIS Online items are inconsistently indexed by the ArcGIS search API (confirmed: Baltimore's actual street-trees FeatureServer did not surface for `q="Baltimore Street Trees"`, while DC's did), and `--backend both` only ever means Socrata+ArcGIS — there's no single global CKAN catalog, so a city whose portal is CKAN (e.g. Boston runs CKAN at data.boston.gov) will correctly return zero results from `both` even though a real dataset exists elsewhere. If `results` is empty, or the top results look irrelevant/low-confidence (wrong jurisdiction, wrong topic, decoy student-project layers), first suspect a CKAN portal: a quick web search for `"<city> open data" CKAN` or the giveaway URL shape `data.<city>.gov` / `opendata.<city>.gov` usually confirms it, and once you have the portal's base URL you can search it directly:

```
node .claude/skills/vet-dataset/scripts/search_catalog.mjs --q "<description>" --backend ckan --portal <portalUrl>
```

Only fall through to fully manual WebSearch/WebFetch/curl vetting once neither `both` nor a guessed CKAN portal turns up a real candidate.

The rest of this step is not scripted — use WebSearch/WebFetch/Bash `curl` with judgment, the same technique used for manual vetting. For each description, find one or more candidate live REST endpoints:

- An ArcGIS candidate must be a URL ending in `/FeatureServer/{n}` or `/MapServer/{n}` — a specific layer, not a service root or a Hub listing page.
- A Socrata candidate must be a `domain` + 4x4 `resource id` pair (e.g. `data.cityofnewyork.us` + `erm2-nwe9`).
- A CKAN candidate must be a `portalUrl` + DataStore `resource id` pair (e.g. `https://data.boston.gov` + `254adca6-64ab-4c5c-9fc0-a6da622be185`), confirmed to be a real DataStore-active resource — a `/dataset/...` package landing page alone isn't enough, since a package can bundle several resources (e.g. one per year) and only some may be DataStore-backed.
- Reject Hub "explore"/"about" pages (`*.hub.arcgis.com/datasets/.../about`) and standalone external dashboards/web-apps that have no REST API behind them — these are decoys, not candidates.
- When an ArcGIS Hub org is already known, prefer `sharing/rest/search?q=orgid:<org>` (or similar `sharing/rest` enumeration) over generic web search to list every layer in a service — this surfaces layer numbers and names directly.
- When a service exposes multiple year/archive layers (e.g. a rolling "last 90 days" layer plus a full historical archive), prefer the rolling/current layer, but pass **both** to verification when it's ambiguous which is faster or better-formed — the latency and fill-rate checks will settle it empirically rather than by guessing.
- If more than one description needs discovery in a single invocation, spawn one Explore or general-purpose agent per description in parallel (mirroring multi-dataset vetting sessions). Each agent's job is to return candidate URL(s)/domain+id pairs — not a verdict. Verdicts only come from Step 4.

## 4. Verify (deterministic, per candidate)

For every candidate found in Discovery (Step 3), run the checker via Bash:

```
node .claude/skills/vet-dataset/scripts/check_candidate.mjs --backend arcgis --url <FeatureServer/MapServer layer URL>
node .claude/skills/vet-dataset/scripts/check_candidate.mjs --backend socrata --domain <domain> --id <resource-id>
node .claude/skills/vet-dataset/scripts/check_candidate.mjs --backend ckan --portal-url <portalUrl> --resource-id <resource-id>
```

Optional flags: `--sample-size` (default 500), `--timeout-ms` (default 15000, mirrors `FETCH_TIMEOUT_MS` in `src/config/constants.ts`).

The script always exits 0 on a completed check (a `"disqualified"` verdict is a successful check, not an error) and prints one JSON object to stdout:

```json
{
  "backend": "arcgis",
  "url": "...",
  "verdict": "qualifies" | "disqualified",
  "reasons": ["..."],
  "stats": { "rowCount": 123, "sampleFillRate": 0.98, "geometryType": "esriGeometryPoint", "queryLatencyMs": 340, "sourceLocationHint": { "...": "..." }, "sampleCentroid": { "lat": 0, "lon": 0 } }
}
```

A non-zero exit means genuine execution failure (unreachable host, malformed response, bad args) — investigate rather than treating it as a disqualification.

Checks performed, mirroring vision.md §5:

- **ArcGIS:** layer type must be `"Feature Layer"` (rejects non-spatial tables) with `geometryType === "esriGeometryPoint"` (rejects polygons); row count > 0; sampled populated-coordinate rate ≥ 90%; representative query latency below `--timeout-ms`.
- **Socrata:** column metadata must show a native `location`/`point` column, or a separate numeric lat/lon column pair (rejects free-text-only geo encodings like a serialized `"(lat,lon)"` string); row count > 0; exact populated-coordinate rate (via aggregate `COUNT`, not a sample — Socrata's default row order is unspecified and biases samples for large datasets) ≥ 90% for at least one of the two geo strategies; representative query latency below `--timeout-ms`.
- **CKAN:** DataStore fields (name-matched, since CKAN's declared field types don't reliably signal geo) must include a separate lat/lon field pair — a native `geometry`/`location` field alone disqualifies, since the app's fetch layer only implements CKAN's `latlon` geo mode, not native geometry; row count (`result.total`) > 0; sampled populated-coordinate rate ≥ 90%; representative query latency below `--timeout-ms`.

`stats.sourceLocationHint` (source's own title/description/tags/attribution) and `stats.sampleCentroid` (median lat/lon of the sample, outlier-resistant) are informational only, never affecting `verdict` — a jurisdiction mismatch is a metadata problem, checked in Synthesize below.

## 5. Synthesize

Combine the script outputs into a final report, grouped by original description:

- Candidate URL/domain+id
- Verdict (qualifies / disqualified)
- One-line reasons (straight from the script's `reasons` array)
- Key stats: row count, fill rate, latency
- When a description had multiple candidates, state an overall pick (the qualifying one; if several qualify, the fastest/most current) — or state clearly that none qualified and why.

**Cross-check location.** Compare the declared city/jurisdiction against `stats.sourceLocationHint`/`sampleCentroid`. On a clear mismatch (wrong state/region — not just neighboring-county sprawl), report **disqualified — location/jurisdiction mismatch**, overriding a script `"qualifies"` (it only checks architectural fit, not identity).

### Record durable rejections

For any candidate whose final verdict is `disqualified` for a **durable / architecture-bound** reason, append one row to `src/config/datasets/rejected.csv` so it's hard-skipped in Step 2 next time. Durable reasons:

- unsupported geo encoding (e.g. a free-text `"(lat,lon)"` string), or non-point/polygon geometry;
- centroid-only coordinates rather than the real per-row location;
- intrinsic sub-90% populated-coordinate fill (consistently low across years, not a single sparse season);
- sensitivity exclusion (deaths / felony-level crime).

**Do NOT record transient failures** — a 5xx / unreachable host (e.g. a service that's temporarily "not started"), a single-year/seasonal low fill, or discovery simply never finding a live endpoint. These are deliberately left out so they get re-vetted later.

**Also skip location/jurisdiction mismatches** — the endpoint itself may be fine under a different, correctly-named candidate, so recording it by URL/domain+id would wrongly hard-skip that future candidate.

Row format is `Proposed Dataset,Reason,Identifier`:

- Quote any field containing a comma (the Reason almost always needs it): `Dallas 311,"free-text lat_location only, geo deferred",www.dallasopendata.com/d7e7-envw`.
- `Identifier` is the same form the checker consumes — full `FeatureServer/MapServer/{n}` URL, Socrata `domain/4x4`, or CKAN `portalUrl/resourceId` — and should always be present for a durable rejection (reaching a durable verdict means Verify ran against a concrete endpoint).
- **Upsert, don't blind-append:** skip if that identifier (or the name, when no identifier) already appears in `rejected.csv`.

## Output format

One report per original dataset description. For each: the description, then each candidate's verdict/reasons/stats, then a final pick or "none qualify" conclusion. Keep it as terse as the stats allow — this mirrors the reporting style used for manual vetting sessions, not a prose writeup.
