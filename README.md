# Opendata Explorer

A zero-backend, conversational GIS for civic open data. Chat in plain language, and the app maps your request to a query against the right dataset's backend, fetches the data, and renders it live on a [MapLibre](https://maplibre.org/) map. There is no server: it's a static single-page app that runs a small language model on your own GPU (via WebGPU) and talks directly, from your browser, to each dataset's data portal.

Full product vision, architecture, and design rationale: [vision.md](vision.md).

## Datasets

The curated catalog lives in [`src/config/datasets/`](src/config/datasets/) — one file per dataset, each a `DatasetDefinition` (Socrata, ArcGIS, or CKAN) validated against [`datasets.schema.ts`](src/config/datasets/datasets.schema.ts). See [vision.md § Architectural Guardrails](vision.md#5-architectural-guardrails) for what qualifies a dataset for curation.

## Tech stack

| Layer | Technology |
| :--- | :--- |
| Frontend framework | React (Vite) — static SPA, no server runtime |
| Chat component | [`assistant-ui`](https://www.assistant-ui.com/) |
| AI orchestration | Vercel AI SDK (`ai` + `@assistant-ui/react-ai-sdk`), with Qwen3.5 2B running in-browser via [Transformers.js](https://huggingface.co/docs/transformers.js) (WebGPU, in a Web Worker) |
| Data sources | Socrata Open Data (SODA API), ArcGIS Hub (FeatureServer REST), and CKAN (DataStore API) |
| Map engine | MapLibre GL JS + `react-map-gl` |
| Client persistence | `localStorage` (optional Socrata app tokens only) and the browser Cache API (model weights) |

## Quick start

```bash
npm install
npm run dev
```

Open the app and press **Download model** in the chat rail to fetch the on-device model (see below). The map works without it.

## On-device model

The assistant is [`onnx-community/Qwen3.5-2B-ONNX-OPT`](https://huggingface.co/onnx-community/Qwen3.5-2B-ONNX-OPT), run entirely in your browser with Transformers.js on WebGPU. Nothing you type is sent to a model provider, and there are no API keys.

Requirements:

- A desktop Chromium browser (Chrome or Edge) with **WebGPU** and the **`shader-f16`** feature. The chat rail runs a capability check and says what is missing.
- A **~5.5 GB one-time download** (fp16 weights), cached by the browser. It only starts when you press **Download model**; on later visits a cached model loads automatically.
- Roughly 5 GB or more of free GPU memory.

Known limits: the first message of a conversation takes about 30–40 seconds to process (later steps reuse the model's KV cache and take a few seconds); replies appear when a step finishes rather than streaming; decoding is greedy. Quantized (smaller) weights were measured to pick wrong datasets, so `fp16` is used until a better quantization is validated — the precision is one constant in [`src/config/localModel.ts`](src/config/localModel.ts). The model's runtime (ONNX Runtime WASM files) is loaded from a CDN.

The tool-calling prompt format and parser are in [`src/lib/ai/localModel/`](src/lib/ai/localModel/).

## Data access

Each dataset declares its own backend (`socrata`, `arcgis`, or `ckan`) — and, for Socrata, its portal `domain` — in its definition under [`src/config/datasets/`](src/config/datasets/). Because Socrata app tokens are portal-specific (a token issued for one portal won't raise rate limits on another), Settings shows one optional app token input per distinct Socrata domain used by the current catalog, derived automatically from the dataset list. It's not required to use the app.

The client enforces a hard cap on result size and a request timeout regardless of what the model requests, to keep the browser tab responsive.

## Privacy

Prompts and conversations never leave your device: the model runs locally. The only network calls are to the dataset portals you query, a one-time download of the model weights from Hugging Face (and the ONNX Runtime WASM files from a CDN), and map tiles. Optional Socrata app tokens are stored in plaintext in `localStorage`; clearing the site's data removes them and the cached model.

## Development

```bash
npm run dev      # start the dev server
npm run dev:lan  # same, but reachable from other machines on your LAN (see below)
npm run build     # typecheck + production build
npm run lint      # oxlint
npm test          # unit tests (offline)
npm run test:live # exemplar live-data regression suite (hits real Socrata/ArcGIS/CKAN endpoints)
npm run eval      # on-device model evals; needs a WebGPU browser pointed at it (see below)
```

### Testing from another machine on your LAN

`npm run dev:lan` binds to `0.0.0.0:5173`. Vite rejects unknown `Host` headers, so by default it also allows any `*.local` name; set `DEV_ALLOWED_HOSTS` (comma-separated) to allow specific hosts instead, e.g. `DEV_ALLOWED_HOSTS=my-mac.local npm run dev:lan`.

- **WebGPU needs a secure context.** `http://<host>.local:5173` isn't one, so on the other machine add that exact origin to `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, set it to Enabled, and relaunch Chrome.
- **The model cache is per-origin.** The ~5.5 GB cache belongs to the exact origin (scheme, host and port), so changing the hostname or port means downloading the model again.

`tests/exemplars.live.test.ts` (`npm run test:live`, run on a schedule by `.github/workflows/live-tests.yml` and kept out of `npm test` so upstream outages don't block CI) runs every hand-written example query from `src/config/datasets/*.ts` against its live backend and asserts each returns at least one feature. It's a smoke test, not a snapshot test — it catches upstream dataset/column renames, not content regressions.

### Evaluating the on-device model

`npm run eval` runs the cases in `evals/*.eval.ts` against the real on-device model, so they need a WebGPU browser with the model cached; they are not part of `npm test` or CI. Each case builds the exact messages the agent loop sends (`evals/harness.ts` reuses `toQwenMessages`, `buildSystemPrompt` and the app's tools), calls `engineClient.generate`, and classifies the output as plain text or a tool call. Decoding is greedy, so a case is repeatable. `evals/summaryAfterResult.eval.ts` is the first: after a successful fetch the model should answer in text with the result count (vision.md: Grounded Result Summaries), and it records the loop where it repeats the call instead. A case marked `it.fails` documents behaviour that is known to fail; it turns red when the model starts passing, which is the cue to update it.

1. Stop `dev:lan`. The eval server takes over port 5173 so the page has the same origin as `dev:lan`, which already has the secure-context flag and the cached model (see above). It uses the Vitest `preview` provider, so it opens no browser itself (`BROWSER=none`).
2. Run `npm run eval` and copy the `Browser runner started at …` URL it prints. It includes a per-run `sessionId`.
3. On the GPU machine, open that URL with the LAN hostname in place of `localhost`, for example `http://vini.local:5173/__vitest_test__/?sessionId=…`, and keep the tab visible; Chrome stops painting hidden tabs. Results show in the Vitest UI, in the terminal, in `evals/results/latest.json`, and as a plain log in `#eval-log` on that page.

Each case takes about a minute (a changed prefix means the KV cache is rebuilt), so expect a few minutes for the suite.

## Adding a dataset

Add a new file under `src/config/datasets/`, export a `DatasetDefinition` matching one of the shapes in [`datasets.schema.ts`](src/config/datasets/datasets.schema.ts) (Socrata, ArcGIS, or CKAN), and register it in [`src/config/datasets/index.ts`](src/config/datasets/index.ts). The system prompt and the tool's dataset enum both derive from that index automatically. The dataset `id` is what the model types, so use a readable slug (`nyc-tree-census`), not an opaque one; for Socrata, put the 4x4 resource ID in `resourceId`. The on-device model never picked a dataset whose `id` was a bare 4x4 like `uvpi-gqnh`. See [vision.md § Schema Scope](vision.md#5-architectural-guardrails) for what qualifies a dataset for curation.
