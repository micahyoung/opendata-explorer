---
name: vet-dataset
description: Vet a candidate civic-open-data dataset against this app's catalog qualifying bar. Use for "check if X dataset would work", "is Y suitable for the catalog", "vet this dataset", "find a dataset for <city>", or naming a candidate city/dataset to add. Always invoke instead of manually curling/WebFetching candidate endpoints by hand.
---

# Vet Dataset

Vets candidate datasets for the curated catalog in two phases: non-deterministic discovery (find the real live endpoint) and deterministic verification (`scripts/check_candidate.mjs`) against the same bar every dataset in `src/config/datasets/` was held to.

## 1. Parse the request

Identify one or more natural-language dataset descriptions (e.g. "Philadelphia 311 requests", or a list of several cities/datasets). Treat each description independently through the rest of this skill.

## 2. Discovery (per description)

This step is not scripted — use WebSearch/WebFetch/Bash `curl` with judgment, the same technique used for manual vetting. For each description, find one or more candidate live REST endpoints:

- An ArcGIS candidate must be a URL ending in `/FeatureServer/{n}` or `/MapServer/{n}` — a specific layer, not a service root or a Hub listing page.
- A Socrata candidate must be a `domain` + 4x4 `resource id` pair (e.g. `data.cityofnewyork.us` + `erm2-nwe9`).
- Reject Hub "explore"/"about" pages (`*.hub.arcgis.com/datasets/.../about`) and standalone external dashboards/web-apps that have no REST API behind them — these are decoys, not candidates.
- When an ArcGIS Hub org is already known, prefer `sharing/rest/search?q=orgid:<org>` (or similar `sharing/rest` enumeration) over generic web search to list every layer in a service — this surfaces layer numbers and names directly.
- When a service exposes multiple year/archive layers (e.g. a rolling "last 90 days" layer plus a full historical archive), prefer the rolling/current layer, but pass **both** to verification when it's ambiguous which is faster or better-formed — the latency and fill-rate checks will settle it empirically rather than by guessing.
- If more than one description needs discovery in a single invocation, spawn one Explore or general-purpose agent per description in parallel (mirroring multi-dataset vetting sessions). Each agent's job is to return candidate URL(s)/domain+id pairs — not a verdict. Verdicts only come from step 3.

## 3. Verify (deterministic, per candidate)

For every candidate found in step 2, run the checker via Bash:

```
node .claude/skills/vet-dataset/scripts/check_candidate.mjs --backend arcgis --url <FeatureServer/MapServer layer URL>
node .claude/skills/vet-dataset/scripts/check_candidate.mjs --backend socrata --domain <domain> --id <resource-id>
```

Optional flags: `--sample-size` (default 500), `--timeout-ms` (default 15000, mirrors `FETCH_TIMEOUT_MS` in `src/config/constants.ts`).

The script always exits 0 on a completed check (a `"disqualified"` verdict is a successful check, not an error) and prints one JSON object to stdout:

```json
{
  "backend": "arcgis",
  "url": "...",
  "verdict": "qualifies" | "disqualified",
  "reasons": ["..."],
  "stats": { "rowCount": 123, "sampleFillRate": 0.98, "geometryType": "esriGeometryPoint", "queryLatencyMs": 340 }
}
```

A non-zero exit means genuine execution failure (unreachable host, malformed response, bad args) — investigate rather than treating it as a disqualification.

Checks performed, mirroring vision.md §5:

- **ArcGIS:** layer type must be `"Feature Layer"` (rejects non-spatial tables) with `geometryType === "esriGeometryPoint"` (rejects polygons); row count > 0; sampled populated-coordinate rate ≥ 90%; representative query latency below `--timeout-ms`.
- **Socrata:** column metadata must show a native `location`/`point` column, or a separate numeric lat/lon column pair (rejects free-text-only geo encodings like a serialized `"(lat,lon)"` string); row count > 0; sampled populated-coordinate rate ≥ 90%; representative query latency below `--timeout-ms`.

## 4. Synthesize

Combine the script outputs into a final report, grouped by original description:

- Candidate URL/domain+id
- Verdict (qualifies / disqualified)
- One-line reasons (straight from the script's `reasons` array)
- Key stats: row count, fill rate, latency
- When a description had multiple candidates, state an overall pick (the qualifying one; if several qualify, the fastest/most current) — or state clearly that none qualified and why.

## Output format

One report per original dataset description. For each: the description, then each candidate's verdict/reasons/stats, then a final pick or "none qualify" conclusion. Keep it as terse as the stats allow — this mirrors the reporting style used for manual vetting sessions, not a prose writeup.
