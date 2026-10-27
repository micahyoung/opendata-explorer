import { formatActiveResultsChangedText } from "../src/lib/ai/activeResultsSignal";
import type { ChatMessage } from "../src/lib/ai/localModel/types";
import { lookupDatasetDetails } from "../src/lib/ai/tools";
import { baltimoreResult } from "./fixtures/baltimoreRedLightCameras";
import { camdenYardsGeocode, nyc311NoSuchColumn } from "./fixtures/toolResults";
import { expectText, expectToolCall, gradeFetchById, gradeRoute, type Grade, type Outcome } from "./grade";
import { buildMessages, type Turn } from "./prompt";

/** One decision point: the messages the engine sees, one generation, and a structural grade of what came back. */
export interface EvalCase {
  id: string;
  messages: () => ChatMessage[];
  /** Cap on generated tokens; routing needs only the tool name and dataset id. Defaults to the app's limit. */
  maxTokens?: number;
  grade: (outcome: Outcome) => Grade;
  /** Behaviour recorded as failing; the case turns red when the model starts passing. */
  knownFailing?: boolean;
}

const BALTIMORE = "baltimore-red-light-cameras";
const NYC = "nyc-311-service-requests";
const CHICAGO = "chicago-311";

const detailsTurn = (id: string): Turn => ({ tool: "getDatasetDetails", input: { datasetIds: [id] }, output: lookupDatasetDetails([id]) });
const near = (a: unknown, b: number) => typeof a === "number" && Math.abs(a - b) < 1e-6;

const BADLY_FILTERED = "complaint = 'Noise - Residential' AND borough = 'QUEENS'";

/**
 * Six cases, each a different way the on-device agent loop breaks, each one generation. Kept few because a cold case is a prefill
 * of the whole system prompt; the grader is checked against every dataset exemplar in grade.test.ts instead of running them here.
 */
export const cases: EvalCase[] = [
  {
    // Picking the right dataset out of the whole catalog: the failure that ruled out q4f16.
    id: "route/picks the dataset the question names",
    maxTokens: 128,
    messages: () => buildMessages("Illegal parking complaints in Brooklyn"),
    grade: (o) => gradeRoute(NYC, o),
  },
  {
    // vision.md: Grounded Location Resolution. A named place is resolved by a tool, never from the model's memory. A Socrata dataset
    // (no bounding-box parameter) so the model can only skip the geocoder by writing coordinates itself; the Chicago exemplars hold
    // within_circle coordinates it can copy. Swapping in other landmarks and datasets (DC, Boston, SF, NYC) skipped it in 5 of 6.
    id: "geocode/named landmark is geocoded first",
    messages: () => buildMessages("311 requests near Wrigley Field", [detailsTurn(CHICAGO)]),
    grade: (o) => expectToolCall(o, "geocodeLocation", (input) => (/wrigley/i.test(String(input.query)) ? undefined : `query ${JSON.stringify(input.query)} does not name Wrigley Field`)),
  },
  {
    // A tool result chained into a valid ArcGIS query: backend syntax, schema, URL and fields in one check.
    id: "geocode/bounding box is passed through unchanged",
    messages: () =>
      buildMessages("Red light cameras near Camden Yards", [
        detailsTurn(BALTIMORE),
        { tool: "geocodeLocation", input: { query: camdenYardsGeocode.query }, output: camdenYardsGeocode },
      ]),
    grade: (o) => {
      const base = gradeFetchById(BALTIMORE, o);
      if (!base.ok || o.kind !== "tool_call") return base;
      const b = camdenYardsGeocode.boundingBox;
      const ok = near(o.input.minLat, b.minLat) && near(o.input.maxLat, b.maxLat) && near(o.input.minLon, b.minLon) && near(o.input.maxLon, b.maxLon);
      return ok ? base : { ok: false, detail: `bounding box not passed through unchanged: ${JSON.stringify(o.input)}` };
    },
  },
  {
    // vision.md: Agentic Soft-Fail. A hallucinated column comes back as an error and must be fixed, not repeated.
    id: "recovery/hallucinated column is corrected",
    messages: () =>
      buildMessages("Noise complaints in Queens", [
        detailsTurn(NYC),
        { tool: "fetchSocrataData", input: { datasetId: NYC, where: BADLY_FILTERED }, output: nyc311NoSuchColumn },
      ]),
    grade: (o) => {
      const base = gradeFetchById(NYC, o);
      if (!base.ok || o.kind !== "tool_call") return base;
      return o.input.where === BADLY_FILTERED ? { ok: false, detail: "repeated the identical failing query" } : base;
    },
  },
  {
    // vision.md: Grounded Result Summaries. Recorded failure: on "All red light cameras in Baltimore" the model repeats the identical
    // fetchArcGisData call until the step cap. Only system-prompt changes fixed it (dropping the "ONLY reply in this format" paragraph,
    // or telling it a tool result means answer in text); text added to the user turn or the tool result did not.
    id: "summary/answers in text after a successful fetch",
    messages: () => buildMessages("All red light cameras in Baltimore", [{ tool: "fetchArcGisData", input: { datasetId: BALTIMORE }, output: baltimoreResult }]),
    grade: (o) => expectText(o, (text) => (text.includes("180") ? undefined : "the reply does not state the 180 result count")),
    knownFailing: true,
  },
  {
    // The one-line view-changed note once sent the model reading an empty selection and re-running its own query.
    id: "nudge/changed view triggers readActiveResults",
    messages: () =>
      buildMessages(
        "All red light cameras in Baltimore",
        [detailsTurn(BALTIMORE), { tool: "fetchArcGisData", input: { datasetId: BALTIMORE }, output: { ...baltimoreResult, resultSetId: "call_2" } }],
        { assistant: "Showing 180 red light cameras across Baltimore's 14 police districts.", user: ["What am I looking at now?", formatActiveResultsChangedText()] },
      ),
    grade: (o) => expectToolCall(o, "readActiveResults"),
  },
];
