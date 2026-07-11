# Opendata Explorer

A zero-backend, conversational GIS for civic open data. Chat in plain language, and the app maps your request to a query against the right dataset's backend, fetches the data, and renders it live on a [MapLibre](https://maplibre.org/) map. There is no server: it's a static single-page app that talks directly, from your browser, to your own LLM endpoint and to each dataset's data portal.

Full product vision, architecture, and design rationale: [vision.md](vision.md).

## Datasets

The curated catalog lives in [`src/config/datasets/`](src/config/datasets/) — one file per dataset, each a `DatasetDefinition` (Socrata, ArcGIS, or CKAN) validated against [`datasets.schema.ts`](src/config/datasets/datasets.schema.ts). See [vision.md § Architectural Guardrails](vision.md#5-architectural-guardrails) for what qualifies a dataset for curation.

## Tech stack

| Layer | Technology |
| :--- | :--- |
| Frontend framework | React (Vite) — static SPA, no server runtime |
| Chat component | [`assistant-ui`](https://www.assistant-ui.com/) |
| AI orchestration | Vercel AI SDK (`ai` + `@assistant-ui/react-ai-sdk`), calling `/v1/chat/completions` |
| Data sources | Socrata Open Data (SODA API), ArcGIS Hub (FeatureServer REST), and CKAN (DataStore API) |
| Map engine | MapLibre GL JS + `react-map-gl` |
| Client persistence | `localStorage` (BYO credentials only — see [Privacy trade-off](#privacy-trade-off)) |

## Quick start

```bash
npm install
npm run dev
```

Open the app, and you'll be prompted to bring your own LLM credentials before you can chat (see below). No credentials are required to view the blank map itself.

## Bring your own LLM (BYOK)

This app is **entirely client-side** — there is no backend of ours mediating your requests (see [vision.md § Technical Constraints](vision.md#technical-constraints--bring-your-own-architecture) for why). To use the chat, you provide:

- A **Base URL** for an OpenAI-compatible chat completions endpoint
- An **API key**
- A **model name**

These are stored **unencrypted in your browser's `localStorage`** and are sent only to the endpoint you configure — never to any server we control. You can edit or clear them at any time from the **Settings** panel in the top-right corner of the map, which also lets you share a saved configuration as a URL.

### Requirements

Your model **must support native OpenAI-style tool/function calling** — see [vision.md § Tool-Calling Requirement](vision.md#5-architectural-guardrails) for why this is a hard scope boundary rather than something with a fallback. The chat calls a backend-specific fetch tool (see [`src/lib/ai/tools.ts`](src/lib/ai/tools.ts)) to query data; if your model doesn't support tools, it will not be able to query data.

### Supported provider presets

Presets are defined in [`src/config/providerPresets.ts`](src/config/providerPresets.ts): OpenAI, OpenRouter, Local (llama.cpp / Ollama), and Custom.

The app always calls the standard `/v1/chat/completions`-style endpoint (not OpenAI's proprietary Responses API), so any OpenAI-compatible server should work as long as it implements tool calling.

## CORS

Because this app calls your LLM endpoint directly from the browser with no proxy, **your endpoint must allow direct browser CORS requests**. Most hosted APIs that are meant to be called from a trusted backend (rather than a browser) will reject these requests.

- **OpenAI**: works directly from the browser.
- **OpenRouter**: works directly from the browser.
- **Local servers (llama.cpp / Ollama)**: you must start the server with CORS enabled for this app's origin, e.g.:

  ```bash
  # llama.cpp
  llama-server --cors "*" ...

  # Ollama
  OLLAMA_ORIGINS="*" ollama serve
  ```

- **Providers that block browser CORS with no proxy option are unsupported** — see [vision.md § CORS Restrictions](vision.md#5-architectural-guardrails) for why there's no bundled relay/proxy to work around this.

## Data access

Each dataset declares its own backend (`socrata`, `arcgis`, or `ckan`) — and, for Socrata, its portal `domain` — in its definition under [`src/config/datasets/`](src/config/datasets/). Because Socrata app tokens are portal-specific (a token issued for one portal won't raise rate limits on another), Settings shows one optional app token input per distinct Socrata domain used by the current catalog, derived automatically from the dataset list. It's not required to use the app.

The client enforces a hard cap on result size and a request timeout regardless of what the model requests, to keep the browser tab responsive.

## Privacy trade-off

Credentials live in plaintext `localStorage` — see [vision.md § Plaintext Local Credential Storage](vision.md#technical-constraints--bring-your-own-architecture) for why this trade-off is accepted and what it means for your threat model. Operationally: clearing the browser's site data, or using the "Clear credentials" button in Settings, removes them. Nothing is sent to any server other than the LLM endpoint and dataset backend(s) you're already configured to use.

## Development

```bash
npm run dev      # start the dev server
npm run build     # typecheck + production build
npm run lint      # oxlint
npm test          # run the exemplar live-data regression suite (hits real Socrata/ArcGIS/CKAN endpoints)
```

`tests/exemplars.live.test.ts` runs every hand-written example query from `src/config/datasets/*.ts` against its live backend and asserts each returns at least one feature. It's a smoke test, not a snapshot test — it catches upstream dataset/column renames, not content regressions.

## Adding a dataset

Add a new file under `src/config/datasets/`, export a `DatasetDefinition` matching one of the shapes in [`datasets.schema.ts`](src/config/datasets/datasets.schema.ts) (Socrata, ArcGIS, or CKAN), and register it in [`src/config/datasets/index.ts`](src/config/datasets/index.ts). The system prompt and the tool's dataset enum both derive from that index automatically. See [vision.md § Schema Scope](vision.md#5-architectural-guardrails) for what qualifies a dataset for curation.
