# Opendata Explorer

A zero-backend, conversational GIS for NYC Open Data. Chat in plain language, and the app translates your request into a [Socrata](https://dev.socrata.com/) SoQL query, fetches the data, and renders it live on a [MapLibre](https://maplibre.org/) map. There is no server: it's a static single-page app that talks directly, from your browser, to your own LLM endpoint and to NYC's open data API.

v1 ships with exactly four datasets:

- **311 Service Requests** (`erm2-nwe9`)
- **2015 Street Tree Census** (`uvpi-gqnh`)
- **MTA Bus Automated Camera Enforcement Violations** (`kh8p-hcbm`)
- **SF Street Tree List** (`tkzw-k3nq`)

## Quick start

```bash
npm install
npm run dev
```

Open the app, and you'll be prompted to bring your own LLM credentials before you can chat (see below). No credentials are required to view the blank map itself.

## Bring your own LLM (BYOK)

This app is **entirely client-side** — there is no backend of ours mediating your requests. To use the chat, you provide:

- A **Base URL** for an OpenAI-compatible chat completions endpoint
- An **API key**
- A **model name**

These are stored **unencrypted in your browser's `localStorage`** and are sent only to the endpoint you configure — never to any server we control. You can edit or clear them at any time from the **Settings** panel in the top-right corner of the map.

### Requirements

Your model **must support native OpenAI-style tool/function calling**. This app relies on the model calling a `fetchSocrataData` tool to query data; there is no prompt-based JSON-parsing fallback for models that lack tool calling. If your model doesn't support tools, the chat will not be able to query data.

### Supported provider presets

| Preset | Base URL | Notes |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | Any tool-calling chat model, e.g. `gpt-4o`. |
| OpenRouter | `https://openrouter.ai/api/v1` | Pick a model that supports tool calling — not all OpenRouter models do. |
| Local (llama.cpp / Ollama) | `http://localhost:8080/v1` | See CORS note below. Model must support tool calling. |
| Custom | (you provide) | Any OpenAI-compatible, tool-calling endpoint reachable via direct browser CORS. |

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

- **Providers that block browser CORS with no proxy option are unsupported in v1.** There is no bundled relay/proxy server — if a provider rejects direct browser calls, it simply won't work here.

## Socrata data access

Data is fetched directly from each dataset's Socrata portal using the public SODA API. Datasets span multiple Socrata domains — `data.cityofnewyork.us`, `data.ny.gov`, and `data.sfgov.org` — and each dataset declares its own `domain` in its definition. Because Socrata app tokens are portal-specific (a token issued for one portal won't raise rate limits on another), Settings shows one optional app token input per distinct domain used by the current catalog, derived automatically from the dataset list. It's not required to use the app.

The client enforces a hard cap on `$limit` and a request timeout regardless of what the model requests, to keep the browser tab responsive.

## Privacy trade-off

Because credentials live in plaintext `localStorage`:

- Anyone with access to your browser profile (or a malicious extension) can read your API key.
- Clearing the browser's site data, or using the "Clear credentials" button in Settings, removes it.
- Nothing is sent to any server other than the LLM endpoint and Socrata endpoint you're already configured to use.

If this trade-off doesn't work for your threat model, don't put a long-lived production API key in here — use a scoped/limited key instead.

## Development

```bash
npm run dev      # start the dev server
npm run build     # typecheck + production build
npm run lint      # oxlint
npm test          # run the exemplar live-data regression suite (hits real Socrata endpoints)
```

`tests/exemplars.live.test.ts` runs every hand-written example query from `src/config/datasets/*.ts` against the live Socrata API and asserts each returns at least one feature. It's a smoke test, not a snapshot test — it catches upstream dataset/column renames, not content regressions.

## Adding a dataset

Add a new file under `src/config/datasets/`, export a `DatasetDefinition` (validated against `datasets.schema.ts`) with its Socrata ID, field list, a `geo` config (`native` if the dataset has a `location`-typed column usable by the `.geojson` endpoint, `latlon` if it only has separate latitude/longitude columns), and 2-4 example question → SoQL mappings. Register it in `src/config/datasets/index.ts`. The system prompt and the tool's dataset enum both derive from that index automatically.
