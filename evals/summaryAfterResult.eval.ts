import { describe, expect, it } from "vitest";
import { baltimoreResult } from "./fixtures/baltimoreRedLightCameras";
import { buildMessages, describeOutcome, logToPage, step } from "./harness";
import type { ChatMessage } from "../src/lib/ai/localModel/types";

/**
 * After a successful fetch the model should answer in plain language (vision.md: Grounded Result Summaries), not call a tool again.
 * Recorded failure: on "All red light cameras in Baltimore" the model repeats the identical fetchArcGisData call until the step cap.
 * Only system-prompt changes fixed it; text added to the user turn or the tool result did not (the model called a tool again).
 */
const QUESTION = "All red light cameras in Baltimore";
const turn = (output: unknown = baltimoreResult) => [{ tool: "fetchArcGisData", input: { datasetId: "baltimore-red-light-cameras" }, output }];

const system = (msgs: ChatMessage[], edit: (content: string) => string) => msgs.map((m) => (m.role === "system" ? { ...m, content: edit(m.content) } : m));
const FORMAT_PARAGRAPH = /\n\nIf you choose to call a function ONLY reply[\s\S]*?<\/IMPORTANT>/;

interface Case {
  name: string;
  messages: () => ChatMessage[];
  /** Behaviour recorded so far as failing; flips the test when the model starts passing. */
  knownFailing?: boolean;
}

const base = () => buildMessages(QUESTION, turn());

const cases: Case[] = [
  { name: "baseline", messages: base, knownFailing: true },
  { name: "system: drop the 'ONLY reply in this format' paragraph", messages: () => system(base(), (c) => c.replace(FORMAT_PARAGRAPH, "")) },
  { name: "system: say a tool result means answer in text", messages: () => system(base(), (c) => `${c}\n\nWhen a tool result arrives, reply in plain language (no tool call) unless you still need more data.`) },
];

describe("summary after a successful fetch", () => {
  for (const c of cases) {
    const run = async ({ annotate }: { annotate: (message: string) => Promise<unknown> }) => {
      const result = await step(c.messages());
      const detail = describeOutcome(result.outcome);
      await annotate(`${detail}  [${result.promptTokens} prompt tokens, ${result.completionTokens} generated, ${result.trace?.ms ?? "?"} ms]`);
      const ok = result.outcome.kind === "text" && result.outcome.text.includes("180");
      logToPage(c.name, ok, detail);
      expect(detail, c.name).toSatisfy(() => ok);
    };
    if (c.knownFailing) it.fails(c.name, run);
    else it(c.name, run);
  }
});
