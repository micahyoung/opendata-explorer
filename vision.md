
rth-Star Design Document: Conversational GIS for NYC Open Data

## 1. Vision & Overview
To build a purely client-side, zero-backend "Conversational GIS" web application that democratizes access to NYC Open Data. By overlaying a natural language chat interface atop an interactive, high-performance map, users can query, filter, and visualize massive civic datasets without needing to understand SQL or navigate complex data portals. The architecture relies on an agentic "Action-Observation" loop to seamlessly map natural language to the Socrata Query Language (SoQL).

## 2. Product Requirements
### Core Capabilities
* **Conversational Interface:** A chat UI docked alongside the map within a single app shell (a persistent side-by-side rail, not a separate page) that accepts natural language queries and returns visual, geographic updates alongside text.
* **Dynamic Data Rendering:** The ability to visualize thousands of data points (e.g., 311 service requests, tree census) in real-time as MapLibre GL JS layers.
* **Agentic Soft-Fail & Auto-Correction:** LLMs must be provided tool calls to test queries client-side. If a generated SoQL query fails (e.g., hallucinated schema columns), the client must catch the error, return it to the LLM, and prompt a self-correction without breaking the user experience.

### Technical Constraints & "Bring-Your-Own" Architecture
* **Zero-Backend Execution:** The application will be a static/client-side React app. There is no proprietary backend server mediating API requests.
* **BYO-LLM (OpenAI-Compatible):** Users must provide their own API endpoint, API key, and Model Name. This ensures compatibility with OpenAI, OpenRouter, and local models (e.g., `llama.cpp` or Ollama) to support maximum privacy and zero hosting costs. 
* **BYO-Socrata Token:** Users will provide their own Socrata App Token to bypass unauthenticated IP rate limits, shifting all data API quotas to the user.
* **Strict Browser Performance Safeguards:** Hard-coded limits (e.g., `$limit=5000`) and aggressive timeouts must be strictly enforced on the client side before Socrata requests execute to prevent massive GeoJSON payloads from crashing the browser tab.

## 3. General Architecture & Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React (Vite) | Pure static SPA, not Next.js — no server runtime to host, keeping the zero-backend posture literal. |
| **Chat Component** | `assistant-ui` | Provides native Generative UI and tool-calling visualization. Connects seamlessly to the Vercel AI SDK. |
| **AI Orchestration** | Vercel AI SDK (`ai` + `@assistant-ui/react-ai-sdk`) | Handles LLM streaming and tool execution. BYO-LLM endpoints are called via `createOpenAI(...).chat(model)` — the universal `/v1/chat/completions` endpoint, not OpenAI's proprietary Responses API — since that's the only shape OpenRouter and local llama.cpp/Ollama servers actually implement. |
| **Data Source** | NYC Open Data (SODA API) | Natively supports structured `.geojson` responses from SoQL queries. Fetched entirely client-side. |
| **Map Engine** | MapLibre GL JS + `react-map-gl` | WebGL-accelerated rendering capable of handling dense point data smoothly. Avoids the billing liabilities of Mapbox and the performance bottlenecks of Leaflet. |
| **State Management** | `localStorage` | Stores user credentials (BYO keys/endpoints) locally, maintaining the zero-backend privacy posture. |

## 4. Happy-Path User Flow

**Step 1: Onboarding & Configuration (One-time)**
* The user loads the static web app.
* They are greeted by an onboarding modal explaining the BYOK (Bring Your Own Key) architecture.
* The user selects a provider preset (e.g., "OpenAI", "OpenRouter", "Local Llama") which populates the Base URL.
* The user enters their API Key, Model Name, and optional Socrata App Token. 
* Credentials are saved to `localStorage`.

**Step 2: Intent Expression & Schema Injection**
* The user types a query into the `assistant-ui` chat: *"Show me noise complaints in Queens."*
* The Vercel AI SDK packages the message alongside a curated, declarative system prompt containing schemas and worked examples for the two supported v1 datasets (e.g., *Dataset ID: erm2-nwe9, Fields: complaint_type, borough, created_date, location*).
* The payload is sent directly from the browser to the user's configured LLM endpoint.

**Step 3: The Agentic SoQL Loop**
* The LLM identifies the correct dataset and formulates a SoQL query. It triggers the `fetchSocrataData` tool call.
* **Validation:** The client intercepts the tool call. It strictly enforces a `$limit` parameter and runs the fetch request against the Socrata API.
* *(Soft-Fail Scenario)*: If Socrata returns a 400 Bad Request (e.g., misspelled column), the client intercepts it and feeds the error back to the LLM: *"Observation: Column 'borugh' does not exist."* The LLM corrects the typo and tries again.

**Step 4: Rendering the Generative UI**
* The Socrata API returns a valid GeoJSON FeatureCollection.
* The client resolves the tool call, passing the GeoJSON to the `react-map-gl` component.
* The map smoothly animates (flies) to the bounding box of the data. 
* MapLibre GL JS renders the new layer (e.g., orange dots for 311 requests, green for street trees — each dataset gets a fixed accent color) using WebGL over a free open-source basemap.
* The LLM streams a conversational summary into the chat: *"I've mapped 1,000 noise complaints in Queens. You can click on any point to see its exact location."*

**Step 5: Contextual Iteration**
* The user types: *"Switch to trees instead — just the ones in Brooklyn with poor health."*
* The LLM, maintaining conversational context, regenerates the full query against the new dataset (`boroname = 'Brooklyn' AND health = 'Poor'`) rather than patching the previous one. 
* The map's single active layer is replaced (not stacked) with the new result set. 

## 5. Architectural Guardrails (To Be Expanded in Implementation)

* **Schema Scope:** To prevent context-window exhaustion and hallucination, the app will launch with a hardcoded, highly curated declarative dictionary of high-value datasets, each defined in its own config file with schema and worked question→SoQL examples. **v1 ships with exactly two datasets: 311 Service Requests (`erm2-nwe9`) and the 2015 Street Tree Census (`uvpi-gqnh`)**, chosen to prove out the full architecture end-to-end before widening. Additional datasets (e.g., restaurant inspections, NYPD complaints, parks) are deferred to later iterations. Dynamic catalog search is deferred indefinitely.
* **CORS Restrictions:** For local BYO-LLM users (e.g., `llama.cpp`), documentation must explicitly outline how to launch the local server with `--cors "*"` to prevent browser Mixed Content blocks.
* **Deck.gl Deferment:** To minimize initial bundle size and complexity, 3D visualizations and massive dataset rendering (Deck.gl) are out of scope for v1. MapLibre's native layer styling will handle all rendering.
