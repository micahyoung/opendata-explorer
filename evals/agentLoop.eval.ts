import { describe, expect, it } from "vitest";
import { describeRun, logToPage, runAgent } from "./harness";

/**
 * End to end through the real agent loop (real tools, real dataset backends), one exemplar per backend. The assertion is that the
 * run maps the data and ends with a plain-text answer.
 */
const QUESTIONS = [
  { backend: "arcgis", question: "Pothole requests in Raleigh" },
  { backend: "ckan", question: "Street light outages in Boston" },
  { backend: "socrata", question: "Pecan trees in Austin" },
];

const RUN_TIMEOUT = 720_000; // runAgent aborts at 600 s, so the engine is free for the next case

describe("agent loop", () => {
  for (const { backend, question } of QUESTIONS) {
    const id = `${backend}: "${question}"`;
    it(
      id,
      async ({ annotate }) => {
        const run = await runAgent(question);
        const detail = describeRun(run);
        await annotate(detail);
        logToPage(id, run.completed, detail);
        expect(run.error, detail).toBeUndefined();
        expect(run.mapped && run.completed, detail).toBe(true);
      },
      RUN_TIMEOUT,
    );
  }
});
