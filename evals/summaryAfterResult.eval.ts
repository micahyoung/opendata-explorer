import { describe, expect, it } from "vitest";
import { baltimoreResult } from "./fixtures/baltimoreRedLightCameras";
import { buildMessages, describeOutcome, logToPage, step, type Outcome, type Turn } from "./harness";
import type { ChatMessage } from "../src/lib/ai/localModel/types";
import { tools } from "../src/lib/ai/tools";

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
  /** A probe with no expectation yet: the outcome is recorded and the test always passes. */
  observe?: boolean;
}

const base = () => buildMessages(QUESTION, turn());

const dropFormat = (c: string) => c.replace(FORMAT_PARAGRAPH, "");
const SAY_ANSWER = "\n\nWhen a tool result arrives, reply in plain language (no tool call) unless you still need more data.";
const addAnswer = (c: string) => `${c}${SAY_ANSWER}`;
/** Neutral additions of about the same length as SAY_ANSWER that say nothing about tool results: if one of these also stops the loop, the fix is a perturbation, not the instruction. */
const PLACEBOS = [
  "\n\nBackground: the map uses OpenFreeMap tiles, and the open data portals publish new records on a daily to weekly schedule.",
  "\n\nDataset identifiers are lowercase and hyphen-separated, like the ones in the catalog above, and they never change once published.",
  "\n\nThe interface has the map on the left and this chat panel on the right, and the panel scrolls as the conversation grows longer.",
];
const REVERSED = "\n\nWhen a tool result arrives, always call a tool again to double-check it before you reply to the user.";

const cases: Case[] = [
  { name: "baseline", messages: base, knownFailing: true },
  { name: "system: drop the 'ONLY reply in this format' paragraph", messages: () => system(base(), dropFormat) },
  { name: "system: say a tool result means answer in text", messages: () => system(base(), addAnswer) },
  { name: "system: both fixes", messages: () => system(base(), (c) => addAnswer(dropFormat(c))) },
  ...PLACEBOS.map((p, i): Case => ({ name: `system: placebo ${i + 1} (no instruction about tool results)`, messages: () => system(base(), (c) => `${c}${p}`), observe: true })),
  { name: "system: reversed ('always call a tool again')", messages: () => system(base(), (c) => `${c}${REVERSED}`), observe: true },
];

describe("summary after a successful fetch", () => {
  for (const c of cases) {
    const run = async ({ annotate }: { annotate: (message: string) => Promise<unknown> }) => {
      const result = await step(c.messages());
      const detail = describeOutcome(result.outcome);
      await annotate(`${detail}  [${result.promptTokens} prompt tokens, ${result.completionTokens} generated, ${result.trace?.ms ?? "?"} ms]`);
      const ok = result.outcome.kind === "text" && result.outcome.text.includes("180");
      logToPage(c.name, ok, detail);
      if (!c.observe) expect(detail, c.name).toSatisfy(() => ok);
    };
    if (c.knownFailing) it.fails(c.name, run);
    else it(c.name, run);
  }
});

/**
 * The fixes must not cost the first turn: with no tool result yet, the model has to answer a data question with a fetch call.
 * Dropping the format paragraph is the risky one, since that paragraph is what tells the model how to emit a call.
 */
const QUESTIONS = [
  QUESTION,
  "Street light outages in Boston",
  "Homeless camp reports in Kansas City's Council District 4",
  "Red maples in Raleigh",
  "Open fallen tree requests in Cleveland",
];
const variants: { name: string; edit: (content: string) => string }[] = [
  { name: "baseline", edit: (c) => c },
  { name: "drop format paragraph", edit: dropFormat },
  { name: "say answer in text", edit: addAnswer },
  { name: "both fixes", edit: (c) => addAnswer(dropFormat(c)) },
];

describe("first turn still calls a tool", () => {
  for (const q of QUESTIONS) {
    for (const v of variants) {
      const name = `${v.name} | ${q}`;
      it(name, async ({ annotate }) => {
        const result = await step(system(buildMessages(q), v.edit));
        const detail = describeOutcome(result.outcome);
        await annotate(`${detail}  [${result.promptTokens} prompt tokens, ${result.completionTokens} generated, ${result.trace?.ms ?? "?"} ms]`);
        const ok = result.outcome.kind === "tool_call";
        logToPage(name, ok, detail);
        expect(detail, name).toSatisfy(() => ok);
      });
    }
  }
});

/**
 * Edge cases the "answer in text" sentence could expose, each run with and without it:
 * - chain: after getDatasetDetails the model still has to fetch, so a text answer there is a regression;
 * - repeat: the "unless you still need more data" clause must not let the identical call back in;
 * - grounded: a summary may only contain numbers that are in the tool result (vision.md: Grounded Result Summaries).
 */
const numbersIn = (s: string) => s.replace(/(\d),(?=\d{3})/g, "$1").match(/\d+(?:\.\d+)?/g) ?? [];
/** Numbers in a reply that the tool result does not contain; list markers ("1.") are not claims. */
const ungroundedNumbers = (text: string, result: unknown) => {
  const { resultSetId: _id, ...rest } = result as Record<string, unknown>;
  const allowed = new Set(numbersIn(JSON.stringify(rest)));
  return numbersIn(text.replace(/^\s*\d+[.)]\s/gm, "")).filter((n) => !allowed.has(n));
};

const detailsTurn = async (datasetId: string): Promise<Turn> => {
  const execute = tools.getDatasetDetails.execute as (p: { datasetIds: string[] }, o: object) => Promise<unknown>;
  return { tool: "getDatasetDetails", input: { datasetIds: [datasetId] }, output: await execute({ datasetIds: [datasetId] }, { toolCallId: "call_1", messages: [] }) };
};

/** null when the outcome is acceptable, otherwise why it is not. */
type Check = (o: Outcome) => string | null;
const callsFetch: Check = (o) => (o.kind === "tool_call" && o.name.startsWith("fetch") ? null : `expected a fetch tool call, got ${o.kind}`);
const summarises: Check = (o) => {
  if (o.kind !== "text") return `expected a text answer, got ${o.kind}`;
  if (!o.text.includes("180")) return "the answer does not mention the 180 results";
  const bad = ungroundedNumbers(o.text, baltimoreResult);
  return bad.length ? `numbers not in the tool result: ${bad.join(", ")}` : null;
};

interface EdgeCase {
  name: string;
  messages: () => Promise<ChatMessage[]> | ChatMessage[];
  check: Check;
  observe?: boolean;
}
const edgeVariants = [
  { label: "baseline", edit: (c: string) => c, observe: true },
  { label: "say answer in text", edit: addAnswer, observe: false },
];
const edgeCases: EdgeCase[] = edgeVariants.flatMap((v): EdgeCase[] => [
  {
    name: `chain, Baltimore (ArcGIS): details result -> must fetch | ${v.label}`,
    messages: async () => system(buildMessages(QUESTION, [await detailsTurn("baltimore-red-light-cameras")]), v.edit),
    check: callsFetch,
    observe: v.observe,
  },
  {
    name: `chain, Boston (CKAN): details result -> must fetch | ${v.label}`,
    messages: async () => system(buildMessages("Street light outages in Boston", [await detailsTurn("boston-311-service-requests")]), v.edit),
    check: callsFetch,
    observe: v.observe,
  },
  {
    name: `repeat: identical fetch already done twice -> answer, not a third call | ${v.label}`,
    messages: () => system(buildMessages(QUESTION, [...turn(), ...turn({ ...baltimoreResult, resultSetId: "call_2" })]), v.edit),
    check: summarises,
    observe: v.observe,
  },
  {
    name: `grounded: every number in the summary is in the result | ${v.label}`,
    messages: () => system(base(), v.edit),
    check: summarises,
    observe: v.observe,
  },
]);

describe("edge cases for the answer-in-text fix", () => {
  for (const c of edgeCases) {
    it(c.name, async ({ annotate }) => {
      const result = await step(await c.messages());
      const detail = describeOutcome(result.outcome);
      const problem = c.check(result.outcome);
      await annotate(`${problem ?? "ok"}: ${detail}  [${result.promptTokens} prompt tokens, ${result.completionTokens} generated, ${result.trace?.ms ?? "?"} ms]`);
      logToPage(c.name, problem === null, `${problem ?? "ok"}: ${detail}`);
      if (!c.observe) expect(problem, c.name).toBeNull();
    });
  }
});

/**
 * The loop guard (`prepareStep` -> `toolChoice: "none"` -> banned tool-call openers). The messages are the ones the loop sees once it has
 * repeated a call; with the ban on, the model cannot call a tool, so the only acceptable outcome is a grounded text answer.
 * The same messages without the ban are the control: they show what the ban changes.
 */
// Decoding runs at roughly 0.6 s/token on the test GPU and a text answer is much longer than a tool call, so cap it and allow the time.
const GUARD_MAX_TOKENS = 400;
const GUARD_TIMEOUT_MS = 480_000;
describe("loop guard: tool calls forbidden", () => {
  const guardMessages: { name: string; messages: () => ChatMessage[] }[] = [
    { name: "after one fetch", messages: base },
    { name: "after the identical fetch twice", messages: () => buildMessages(QUESTION, [...turn(), ...turn({ ...baltimoreResult, resultSetId: "call_2" })]) },
  ];
  for (const g of guardMessages) {
    it(`ban on, ${g.name}: grounded text answer`, async ({ annotate }) => {
      const result = await step(g.messages(), { forbidToolCalls: true, maxTokens: GUARD_MAX_TOKENS });
      const detail = describeOutcome(result.outcome);
      // What the ban must guarantee is a text answer about the result. Whether every claim in it is right is a separate matter of the
      // model's accuracy (it has mislabelled the districts in the facets), so numbers are reported but not asserted here.
      const mentionsCount = result.outcome.kind === "text" && result.outcome.text.includes("180");
      const grounding = summarises(result.outcome);
      await annotate(`grounding: ${grounding ?? "ok"} | ${JSON.stringify(result.raw)}  [${result.completionTokens} generated, ${result.finish}, ${result.trace?.ms ?? "?"} ms]`);
      logToPage(`guard on ${g.name}`, mentionsCount, `grounding ${grounding ?? "ok"}: ${detail}`);
      expect(result.outcome.kind, "a banned tool call must not come back").toBe("text");
      expect(mentionsCount, "the answer should be about the result").toBe(true);
    }, GUARD_TIMEOUT_MS);
    it(`ban off, ${g.name}: control (observe only)`, async ({ annotate }) => {
      const result = await step(g.messages());
      const detail = describeOutcome(result.outcome);
      await annotate(detail);
      logToPage(`guard off ${g.name}`, summarises(result.outcome) === null, detail);
    });
  }
});

/** The README says decoding is greedy, so the same messages should give the same output: generate each twice back to back and compare. */
describe("decoding is repeatable", () => {
  const repeatable: { name: string; messages: () => ChatMessage[] }[] = [
    { name: "baseline", messages: base },
    { name: "say answer in text", messages: () => system(base(), addAnswer) },
  ];
  for (const c of repeatable) {
    it(c.name, async ({ annotate }) => {
      const first = await step(c.messages());
      const second = await step(c.messages());
      const same = first.raw === second.raw;
      const detail = `run 1: ${describeOutcome(first.outcome)} [${first.promptTokens} prompt tokens]\nrun 2: ${describeOutcome(second.outcome)} [${second.promptTokens} prompt tokens]`;
      await annotate(`${same ? "identical" : "DIFFERENT"}\n${detail}`);
      logToPage(`repeatable: ${c.name}`, same, detail);
      expect(same, `${c.name}: two generations of the same messages differ`).toBe(true);
    });
  }
});

/**
 * Candidate fixes that keep the format paragraph (dropping it stops the loop but breaks the first turn). Each is tried on the Baltimore
 * loop first; only one that stops the loop is checked on first turns, so a failing candidate costs one generation.
 * Every edit must change the prompt: a replace that finds nothing would silently test the baseline.
 */
const replaceOnce = (content: string, from: string, to: string) => {
  if (!content.includes(from)) throw new Error(`candidate edit did not match: ${from.slice(0, 60)}`);
  return content.replace(from, to);
};
const LAST_BULLET = "- If there is no function call available, answer the question like normal with your current knowledge and do not tell the user about function calls";
interface Candidate {
  name: string;
  /** Edits the system prompt. */
  prompt?: (content: string) => string;
  /** Replaces the fixture tool result the loop case feeds the model. */
  result?: unknown;
}
const candidates: Candidate[] = [
  {
    name: "reword the last bullet: a result that answers the question means reply in text",
    prompt: (c) =>
      replaceOnce(
        c,
        LAST_BULLET,
        "- If there is no function call available, or a function result already answers the question, answer the user in plain language like normal and do not call another function",
      ),
  },
  {
    name: "add a bullet: never repeat a call, summarise the result",
    prompt: (c) =>
      replaceOnce(
        c,
        "\n</IMPORTANT>",
        "\n- After a function result arrives, never call the same function again with the same arguments; reply to the user with a plain-language summary of the result\n</IMPORTANT>",
      ),
  },
  {
    name: "soften 'ONLY reply in the following format with NO suffix'",
    prompt: (c) => replaceOnce(c, "If you choose to call a function ONLY reply in the following format with NO suffix:", "When you call a function, use the following format:"),
  },
  {
    name: "tool result carries the next step (system prompt unchanged)",
    result: { ...baltimoreResult, next: "The data is already on the map. Reply to the user now with a plain-language summary; do not call a tool again." },
  },
];
const FIRST_TURNS = [QUESTION, "Street light outages in Boston", "Red maples in Raleigh"];

describe("candidate fixes for the repeated call", () => {
  for (const c of candidates) {
    it(
      c.name,
      async ({ annotate }) => {
        const edit = c.prompt ?? ((x: string) => x);
        const loop = await step(system(buildMessages(QUESTION, turn(c.result ?? baltimoreResult)), edit));
        const loopProblem = summarises(loop.outcome);
        const lines = [`loop step: ${loopProblem ?? "ok"} - ${describeOutcome(loop.outcome)}`];
        const problems = loopProblem ? [loopProblem] : [];
        if (!loopProblem && c.prompt) {
          for (const q of FIRST_TURNS) {
            const first = await step(system(buildMessages(q), edit));
            const ok = first.outcome.kind === "tool_call";
            lines.push(`first turn "${q}": ${ok ? "ok" : "NOT a tool call"} - ${describeOutcome(first.outcome)}`);
            if (!ok) problems.push(`first turn "${q}" is not a tool call`);
          }
        }
        await annotate(lines.join("\n"));
        logToPage(c.name, problems.length === 0, lines.join(" | "));
        expect(problems, c.name).toEqual([]);
      },
      1_200_000,
    );
  }
});
