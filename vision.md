
rth-Star Design Document: Conversational GIS for Civic Open Data

## 1. Vision & Overview
To build a purely client-side, zero-backend "Conversational GIS" web application that democratizes access to civic open data. By overlaying a natural language chat interface atop an interactive, high-performance map, users can query, filter, and visualize massive civic datasets without needing to understand SQL or navigate complex data portals. The architecture relies on an agentic "Action-Observation" loop to seamlessly map natural language to the Socrata Query Language (SoQL). The curated dataset catalog is not tied to any single city, state, or country — it spans whichever Socrata-hosted portals publish the highest-value data, evaluated dataset by dataset.

## 2. Product Requirements
### Core Capabilities
* **Conversational Interface:** A chat UI docked alongside the map within a single app shell (a persistent side-by-side rail, not a separate page) that accepts natural language queries and returns visual, geographic updates alongside text.
* **Dynamic Data Rendering:** The ability to visualize thousands of data points (e.g., 311 service requests, tree census) in real-time as MapLibre GL JS layers, surfacing the variation within a result set at a glance rather than just its location.
* **Point-Level Inspection:** A user can inspect any individual rendered point's details directly, without needing to ask the LLM a follow-up question.
* **Agentic Soft-Fail & Auto-Correction:** LLMs must be provided tool calls to test queries client-side. If a generated SoQL query fails (e.g., hallucinated schema columns), the client must catch the error, return it to the LLM, and prompt a self-correction without breaking the user experience.
* **Grounded Result Summaries:** The LLM must never narrate what a successful query returned without evidence — its conversational recap should reflect the actual results, not a plausible-sounding guess.
* **Grounded Location Resolution:** The LLM must never guess coordinates for a named address, intersection, or landmark from its own trained geographic knowledge — named places are resolved to real coordinates before they're used to filter a query.

### Technical Constraints & "Bring-Your-Own" Architecture
* **Zero-Backend Execution:** The application will be a static/client-side React app. There is no proprietary backend server mediating API requests.
* **BYO-LLM (OpenAI-Compatible):** Users must provide their own API endpoint and API key. This ensures compatibility with OpenAI, OpenRouter, and local models (e.g., `llama.cpp`) to support maximum privacy and zero hosting costs.
* **Dynamic Model Discovery:** The model picker is a dropdown populated from the provider's `GET /v1/models`, not a free-text field.
* **BYO-Socrata Token:** Users will provide their own Socrata App Token(s) to bypass unauthenticated IP rate limits, shifting all data API quotas to the user. Since tokens are issued per Socrata portal, a user querying datasets from multiple portals brings a token for each one they want elevated limits on.
* **Strict Browser Performance Safeguards:** Hard-coded limits (e.g., `$limit=5000`) and aggressive timeouts must be strictly enforced on the client side before Socrata requests execute to prevent massive GeoJSON payloads from crashing the browser tab.

## 3. General Architecture & Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React (Vite) | Pure static SPA, not Next.js — no server runtime to host, keeping the zero-backend posture literal. |
| **Chat Component** | `assistant-ui` | Provides native Generative UI and tool-calling visualization. Connects seamlessly to the Vercel AI SDK. |
| **AI Orchestration** | Vercel AI SDK (`ai` + `@assistant-ui/react-ai-sdk`) | Handles LLM streaming and tool execution. BYO-LLM endpoints are called via the `/v1/responses` API, now supported across OpenAI, OpenRouter, and `llama-server`. |
| **Data Source** | Socrata Open Data (SODA API), multiple portals | Natively supports structured `.geojson` responses from SoQL queries. Fetched entirely client-side. |
| **Map Engine** | MapLibre GL JS + `react-map-gl` | WebGL-accelerated rendering capable of handling dense point data smoothly. Avoids the billing liabilities of Mapbox and the performance bottlenecks of Leaflet. |
| **State Management** | `localStorage` | Stores user credentials (BYO keys/endpoints) locally, maintaining the zero-backend privacy posture. |

## 4. Happy-Path User Flow

**Step 1: Onboarding & Configuration (One-time)**
* The user loads the static web app.
* They are greeted by an onboarding modal explaining the BYOK (Bring Your Own Key) architecture.
* The user selects a provider preset (e.g., "OpenAI", "OpenRouter", "Local Llama") which populates the Base URL.
* The user enters their API Key and optional Socrata App Token(s), then picks a Model from a dropdown populated via the provider's `/v1/models`.
* Credentials are saved to `localStorage`.

**Step 2: Intent Expression & Dataset Discovery**
* The user types a query into the `assistant-ui` chat: *"Show me noise complaints in Queens."*
* The Vercel AI SDK packages the message alongside a curated, declarative system prompt naming every supported dataset (ID, name, and description) so the LLM can identify the right one — but the full field schema and worked question→SoQL examples for a given dataset are only pulled into context on demand, so the base prompt stays lightweight as the catalog of curated datasets grows.
* The payload is sent directly from the browser to the user's configured LLM endpoint.

**Step 3: The Agentic SoQL Loop**
* The LLM identifies the correct dataset and, if it hasn't already seen that dataset's schema this conversation, fetches it via a dedicated tool call before writing a query against it. If the request names a specific address, intersection, or landmark rather than a value already covered by the schema (e.g. a borough), the LLM first resolves it to real coordinates via a geocoding tool call, then uses those coordinates in the query. It triggers the `fetchSocrataData` tool call.
* **Validation:** The client intercepts the tool call. It strictly enforces a `$limit` parameter and runs the fetch request against the Socrata API.
* *(Soft-Fail Scenario)*: If Socrata returns a 400 Bad Request (e.g., misspelled column), the client intercepts it and feeds the error back to the LLM: *"Observation: Column 'borugh' does not exist."* The LLM corrects the typo and tries again.

**Step 4: Rendering the Generative UI**
* The Socrata API returns a valid GeoJSON FeatureCollection.
* The client resolves the tool call, passing the GeoJSON to the `react-map-gl` component.
* The map smoothly animates (flies) to the bounding box of the data. 
* MapLibre GL JS renders the new layer using WebGL over a free open-source basemap.
* The LLM streams a conversational summary into the chat: *"I've mapped 1,000 noise complaints in Queens."*

**Step 5: Contextual Iteration**
* The user types: *"Switch to trees instead — just the ones in Brooklyn with poor health."*
* The LLM, maintaining conversational context, regenerates the full query against the new dataset (`boroname = 'Brooklyn' AND health = 'Poor'`) rather than patching the previous one. 
* The map's single active layer is replaced (not stacked) with the new result set. 

## 5. Architectural Guardrails (To Be Expanded in Implementation)

* **Schema Scope:** To prevent context-window exhaustion and hallucination, the app launches with a hardcoded, highly curated declarative dictionary of high-value datasets, each defined in its own config file with schema and worked question→SoQL examples. Only a dataset's identity (ID, name, description) is always in context; its field schema and exemplars are retrieved by the LLM on demand, one dataset (or a handful, for comparisons) at a time, so growing the curated catalog doesn't grow the cost of every turn. The catalog has grown from its five-dataset v1 launch to fourteen datasets covering 311/service-request and tree-census data across NYC, SF, LA, Chicago, Seattle, Austin, Cincinnati, Calgary, Honolulu, and Baton Rouge, published across eleven different Socrata domains — curated datasets are not assumed to live on a single city-, state-, or country-run domain. Additional dataset categories (e.g., restaurant inspections, NYPD complaints, parks) are deferred to later iterations. Dynamic catalog search is deferred indefinitely. A dataset only qualifies for curation if it exposes real, per-request point coordinates via a genuine SoQL-queryable Socrata table: listings that are merely federated pointers to an external GIS backend (no real rows behind the Socrata API), that only expose neighborhood/ward-centroid coordinates rather than the actual request location, or that leave most rows ungeocoded, are excluded regardless of how promising the listing looks.
* **Geo Representation Scope:** A qualifying dataset's per-row location must be expressed as either a native Socrata point/location column, or a pair of separate numeric latitude/longitude columns — the two representations the fetch layer knows how to turn into map-able coordinates today. A dataset that only encodes location some other way (e.g. a single free-text "(lat,lon)" column) is deferred rather than special-cased, until a third representation is common enough across candidate datasets to justify generalizing the fetch layer for it.
* **Result Grounding:** The curation principle extends past the query itself — which fields are meaningful to summarize about returned results is a curated property of each dataset, not inferred at runtime from a single query's results.
* **Location Grounding:** Named places are resolved to real coordinates by a dedicated geocoding step before the SoQL fetch — the same tool-chaining pattern regardless of which dataset is ultimately queried, so the skill is taught once rather than duplicated per dataset.
* **CORS Restrictions:** For local BYO-LLM users (e.g., `llama.cpp`), documentation must explicitly outline how to launch the local server with `--cors "*"` to prevent browser Mixed Content blocks.
* **Deck.gl Deferment:** To minimize initial bundle size and complexity, 3D visualizations and massive dataset rendering (Deck.gl) are out of scope for v1. MapLibre's native layer styling will handle all rendering.
* **Low Reasoning Effort & Verbosity by Default:** For models that support it, requests default to low reasoning effort and low text verbosity, since SoQL generation doesn't need deep reasoning; unsupported params are soft-failed and dropped rather than erroring.
* **Anthropic Out of Scope for Direct BYO:** Anthropic has no native `/v1/responses` support, so direct Anthropic BYO isn't supported under this standardization (it wasn't a named target previously either).
