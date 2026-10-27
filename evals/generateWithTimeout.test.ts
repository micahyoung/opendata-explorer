import { describe, expect, it } from "vitest";
import { abortedWith, type GenerateRequest, type GenerateResult, type LocalEngine, type StepProgress } from "../src/lib/ai/localModel/types";
import { generateWithTimeout } from "./generateWithTimeout";

const req: GenerateRequest = { messages: [{ role: "user", content: "hi" }], maxTokens: 8, thinking: false };
const result: GenerateResult = { raw: "ok", promptTokens: 1, completionTokens: 1, finish: "stop" };

/** A worker that, like the real one, only answers an abort after `settleMs` (it finishes its current work first). */
function engineThatNeverFinishes(settleMs: number, state: { busy: boolean }): LocalEngine {
  return {
    generate: (_req, signal) =>
      new Promise((_resolve, reject) => {
        state.busy = true;
        signal?.addEventListener("abort", () =>
          setTimeout(() => {
            state.busy = false;
            reject(new DOMException("Aborted", "AbortError"));
          }, settleMs),
        );
      }),
  };
}

describe("generateWithTimeout", () => {
  it("returns the result of a step that finishes in time", async () => {
    expect(await generateWithTimeout({ generate: async () => result }, req, 1000)).toEqual(result);
  });

  it("aborts a step that overruns and reports it as a timeout", async () => {
    const state = { busy: false };
    await expect(generateWithTimeout(engineThatNeverFinishes(0, state), req, 20)).rejects.toThrow(/did not finish within/);
  });

  it("settles only after the engine has stopped, so the next step is not rejected as busy", async () => {
    const state = { busy: false };
    await generateWithTimeout(engineThatNeverFinishes(30, state), req, 10).catch(() => undefined);
    expect(state.busy).toBe(false);
  });

  it("passes other errors through unchanged", async () => {
    const engine: LocalEngine = { generate: async () => Promise.reject(new Error("The model is already generating.")) };
    await expect(generateWithTimeout(engine, req, 1000)).rejects.toThrow("already generating");
  });

  it("says how far the step got when the engine reports it", async () => {
    const progress: StepProgress = { phase: "decode", elapsedMs: 40, prefillMs: 10, tokens: 3, partial: "x".repeat(500) };
    const engine: LocalEngine = {
      generate: (_req, signal) => new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(abortedWith(progress)))),
    };
    await expect(generateWithTimeout(engine, req, 10)).rejects.toThrow(`Progress: ${JSON.stringify(progress)}`);
  });

  it("keeps the short message when the engine reports no progress", async () => {
    const engine: LocalEngine = {
      generate: (_req, signal) => new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(abortedWith()))),
    };
    await expect(generateWithTimeout(engine, req, 10)).rejects.toThrow(/^The step did not finish within 0 s, so it was aborted and the engine reset\.$/);
  });
});
