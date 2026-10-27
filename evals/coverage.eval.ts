import { describe, expect, it } from "vitest";
import { cases } from "./cases";
import { logToPage, step } from "./harness";
import { describeOutcome } from "./prompt";

/** One generation per case, graded structurally (evals/grade.ts). */
const split = (r: { prefillMs?: number; decodeMs?: number }) => (r.prefillMs === undefined ? "" : ` (prefill ${r.prefillMs} + decode ${r.decodeMs})`);

describe("agent loop decision points", () => {
  for (const c of cases) {
    const run = async ({ annotate }: { annotate: (message: string) => Promise<unknown> }) => {
      const result = await step(c.messages(), { maxTokens: c.maxTokens });
      const grade = c.grade(result.outcome);
      const outcome = describeOutcome(result.outcome);
      await annotate(`${outcome}  [${result.promptTokens} prompt tokens, ${result.completionTokens} generated, ${result.ms} ms${split(result)}]`);
      logToPage(c.id, grade.ok, grade.ok ? outcome : `${grade.detail} -> ${outcome}`);
      expect(grade.ok, `${c.id}: ${grade.detail}`).toBe(true);
    };
    if (c.knownFailing) it.fails(c.id, run);
    else it(c.id, run);
  }
});
