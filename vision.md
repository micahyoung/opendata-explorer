
North-Star Design Document: Conversational GIS for Civic Open Data

*This describes the current, shipped architecture and its binding constraints — it is not a backlog. If it disagrees with the code, treat that as a doc bug to fix, not a feature to build.*

## 1. Vision & Overview
To build a purely client-side, zero-backend "Conversational GIS" web application that democratizes access to civic open data. By overlaying a natural language chat interface atop an interactive, high-performance map, users can query, filter, and visualize massive civic datasets without needing to understand SQL or navigate complex data portals. The architecture relies on an agentic "Action-Observation" loop to seamlessly map natural language to the query dialect of whichever backend hosts a given dataset. The curated dataset catalog is not tied to any single city, state, country, or hosting platform — it spans whichever open data platforms (e.g. Socrata, ArcGIS Hub) publish the highest-value data, evaluated dataset by dataset.

## 2. Product Requirements
### Core Capabilities
* **Conversational Interface:** A chat UI docked alongside the map within a single app shell (a persistent side-by-side rail, not a separate page) that accepts natural language queries and returns visual, geographic updates alongside text.
* **Dynamic Data Rendering:** The ability to visualize thousands of data points (e.g., 311 service requests, tree census) in real-time as MapLibre GL JS layers, surfacing the variation within a result set at a glance rather than just its location.
* **Point-Level Inspection:** A user can inspect any individual rendered point's details directly, without needing to ask the LLM a follow-up question. Multiple points can be pinned open at once, and a point never silently hides that it represents more than one record. Pinned points are attached to the user's next chat message as grounded context the LLM can reference, so the user never has to redescribe what they clicked.
* **Result-Set Recall:** A user can revisit any earlier result set from the conversation without re-querying.
* **Row-Level Grounding for the LLM:** Beyond aggregate facets, the LLM can read a result set's underlying rows when a question calls for specific records.
* **Agentic Soft-Fail & Auto-Correction:** LLMs must be provided tool calls to test queries client-side. If a generated query fails (e.g., hallucinated schema columns), the client must catch the error, return it to the LLM, and prompt a self-correction without breaking the user experience.
* **Grounded Result Summaries:** The LLM must never narrate what a successful query returned without evidence — its conversational recap should reflect the actual results, not a plausible-sounding guess.
* **Grounded Location Resolution:** The LLM must never guess coordinates for a named address, intersection, or landmark from its own trained geographic knowledge — named places are resolved to real coordinates before they're used to filter a query.

### Technical Constraints & "Bring-Your-Own" Architecture
* **Zero-Backend Execution:** The application will be a static/client-side React app. There is no proprietary backend server mediating API requests.
* **BYO-LLM (OpenAI-Compatible):** Users must provide their own API endpoint and API key. This ensures compatibility with OpenAI, OpenRouter, and local models (e.g., `llama.cpp`) to support maximum privacy and zero hosting costs.
* **Dynamic Model Discovery:** The model picker is a dropdown populated from the provider's `GET /v1/models`, not a free-text field.
* **BYO-Socrata Token:** Users will provide their own Socrata App Token(s) to bypass unauthenticated IP rate limits, shifting all data API quotas to the user. Since tokens are issued per Socrata portal, a user querying datasets from multiple portals brings a token for each one they want elevated limits on.
* **Strict Browser Performance Safeguards:** Hard-coded row-count limits and aggressive timeouts must be strictly enforced on the client side before any backend request executes, to prevent massive GeoJSON payloads from crashing the browser tab.
* **Obfuscated (Not Encrypted) Local Credential Storage (Accepted Trade-off):** All BYO credentials (LLM API key, Socrata app tokens) are stored in the browser's `localStorage`, the app's only persistence layer, lightly obfuscated with AES-GCM keyed off the page's own hostname (the "Copy config link" URL param uses the same scheme). This is not a real security boundary — the "key" is derivable from the origin itself, so anyone with browser profile or extension access can trivially reproduce it — it just stops the stored value from being plaintext-grep-able. This is a deliberate consequence of the zero-backend architecture, not an oversight. Users whose threat model doesn't tolerate local access to their credentials are expected to use a scoped/limited key rather than a long-lived production credential.

## 3. General Architecture & Stack

A static, client-rendered SPA with no server runtime and no build-time secrets. Two open data query dialects (Socrata SoQL, Esri REST) are fetched directly from the browser and rendered as WebGL map layers; LLM calls go straight from the browser to the user's configured OpenAI-compatible endpoint. See [README.md](README.md) for the specific libraries and packages this is built from.

## 4. Happy-Path User Flow

**Step 1: Onboarding & Configuration (One-time)**
* The user loads the static web app.
* They are greeted by an onboarding modal explaining the BYOK (Bring Your Own Key) architecture.
* The user selects a provider preset (e.g., "OpenAI", "OpenRouter", "Local (llama.cpp / Ollama)") which populates the Base URL.
* The user enters their API Key and optional Socrata App Token(s), then picks a Model from a dropdown populated via the provider's `/v1/models`.
* Credentials are saved to `localStorage`.
* A saved configuration can also be shared as a single URL, letting a user reuse it on another device or hand it off without retyping. Since the link carries the API key and any Socrata tokens (obfuscated the same way as `localStorage`, not a real security boundary), generating one is always an explicit user action, never automatic.

**Step 2: Intent Expression & Dataset Discovery**
* Instead of a blank chat box, the user can start from a clickable suggested question drawn from the curated catalog.
* The user types a query into the `assistant-ui` chat: *"Show me noise complaints in Queens."*
* The Vercel AI SDK packages the message alongside a curated, declarative system prompt naming every supported dataset (ID, name, and description) so the LLM can identify the right one — but the full field schema, worked query exemplars, and backend-specific query syntax for a given dataset are only pulled into context on demand, so the base prompt stays lightweight and backend-agnostic as the catalog of curated datasets grows.
* The payload is sent directly from the browser to the user's configured LLM endpoint.

**Step 3: The Agentic Query Loop**
* The LLM identifies the correct dataset and, if it hasn't already seen that dataset's schema this conversation, fetches it via a dedicated tool call before writing a query against it — that response also names which backend-specific fetch tool to call and how. If the request names a specific address, intersection, or landmark rather than a value already covered by the schema (e.g. a borough), the LLM first resolves it to real coordinates via a geocoding tool call, then uses those coordinates in the query. Either way, it finishes by triggering the fetch tool call for that dataset's backend.
* **Validation:** The client intercepts the tool call. It strictly enforces a row-count cap and runs the fetch request against the dataset's backend.
* *(Soft-Fail Scenario)*: If the backend rejects the query (e.g., misspelled column), the client intercepts the error and feeds it back to the LLM: *"Observation: Column 'borugh' does not exist."* The LLM corrects the typo and tries again.

**Step 4: Rendering the Generative UI**
* The backend returns a valid GeoJSON FeatureCollection.
* The client resolves the tool call, passing the GeoJSON to the `react-map-gl` component.
* The map smoothly animates (flies) to the bounding box of the data. 
* MapLibre GL JS renders the new layer using WebGL over a free open-source basemap.
* The LLM streams a conversational summary into the chat: *"I've mapped 1,000 noise complaints in Queens."*

**Step 5: Contextual Iteration**
* The user types: *"Switch to trees instead — just the ones in Brooklyn with poor health."*
* The LLM, maintaining conversational context, regenerates the full query against the new dataset (`boroname = 'Brooklyn' AND health = 'Poor'`) rather than patching the previous one. 
* The map's single active layer is replaced (not stacked) with the new result set.
* Earlier result sets aren't discarded — they remain recallable, on the map or by the LLM, without a new backend request.

## 5. Architectural Guardrails

* **Schema Scope:** To prevent context-window exhaustion and hallucination, the app launches with a hardcoded, highly curated declarative dictionary of high-value datasets, each defined in its own config file with schema and worked query exemplars. Only a dataset's identity (ID, name, description) is always in context; its field schema, exemplars, and backend-specific query syntax are retrieved by the LLM on demand, one dataset (or a handful, for comparisons) at a time, so growing the curated catalog doesn't grow the cost of every turn. The catalog has grown from its five-dataset v1 launch to twenty-one datasets covering 311/service-request, tree-census, school-location, and automated traffic-camera-enforcement data across NYC, SF, LA, Chicago, Seattle, Austin, Cincinnati, Calgary, Honolulu, Baton Rouge, Raleigh, and Durham, published across eleven Socrata domains plus four ArcGIS Hub FeatureServers — curated datasets are not assumed to live on a single city-, state-, or country-run domain, or a single hosting platform. Additional dataset categories (e.g., restaurant inspections, NYPD complaints, parks) are deferred to later iterations. Dynamic catalog search is deferred indefinitely. A dataset only qualifies for curation if it exposes real, per-request point coordinates via a genuinely queryable table (Socrata or ArcGIS FeatureServer): listings that are merely federated pointers to an external GIS backend with no real rows behind the queryable API, that only expose neighborhood/ward-centroid coordinates rather than the actual request location, or that leave most rows ungeocoded, are excluded regardless of how promising the listing looks.
* **Geo Representation Scope:** A qualifying dataset's per-row location must be expressed as one of the representations the fetch layer knows how to turn into map-able coordinates today: a native Socrata point/location column, a pair of separate numeric latitude/longitude columns, or native ArcGIS point geometry. Polygon/other non-point geometry, and any other location encoding (e.g. a single free-text "(lat,lon)" column), are deferred rather than special-cased, until common enough across candidate datasets to justify generalizing the fetch and map-rendering layers for them.
* **Result Grounding:** The curation principle extends past the query itself — which fields are meaningful to summarize about returned results is a curated property of each dataset, not inferred at runtime from a single query's results.
* **Duplicate-Coordinate Disclosure:** Rows sharing an exact coordinate (e.g. centroid-geocoded datasets) render as one point with a visible count, never as hidden overlapping duplicates. Merging is exact-coordinate only, never proximity-based clustering — nearby-but-distinct points always stay distinguishable.
* **Location Grounding:** Named places are resolved to real coordinates by a dedicated geocoding step before the fetch — the same tool-chaining pattern regardless of which dataset or backend is ultimately queried, so the skill is taught once rather than duplicated per dataset.
* **CORS Restrictions:** Because there is no bundled relay/proxy, any BYO-LLM endpoint must accept direct browser CORS requests — a provider that blocks browser calls with no proxy option is out of scope, not a bug to fix here. For local BYO-LLM users (e.g., `llama.cpp`), documentation must explicitly outline how to launch the local server with `--cors "*"` to prevent browser Mixed Content blocks.
* **Tool-Calling Requirement:** Models without native OpenAI-style function/tool calling are out of scope for v1 — there is no prompt-based JSON-parsing fallback for the query-generation loop. A model that can't call the fetch tool simply can't query data through this app.
* **Deck.gl Deferment:** To minimize initial bundle size and complexity, 3D visualizations and massive dataset rendering (Deck.gl) are out of scope for v1. MapLibre's native layer styling will handle all rendering.
* **Low Reasoning Effort & Verbosity by Default:** For models that support it, requests default to low reasoning effort and low text verbosity, since query generation doesn't need deep reasoning; unsupported params are soft-failed and dropped rather than erroring.
* **Anthropic Out of Scope for Direct BYO:** Anthropic's native API isn't Chat-Completions-shaped (different request/response schema, no drop-in compatibility layer), so direct Anthropic BYO isn't supported.
* **Bounded Result History:** Result-set recall and row-level grounding are backed by a capped history, not unbounded retention.
