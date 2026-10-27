import { MAX_OUTPUT_TOKENS } from "../src/config/localModel";
import { engineClient } from "../src/lib/ai/localModel/engineClient";
import type { ChatMessage, GenerateResult } from "../src/lib/ai/localModel/types";
import type { Outcome } from "./grade";
import { generateWithTimeout } from "./generateWithTimeout";
import { classify } from "./prompt";

export interface StepResult extends Pick<GenerateResult, "raw" | "promptTokens" | "completionTokens" | "finish"> {
  outcome: Outcome;
  ms: number;
  /** Of `ms`: the prefill (to the first token) and the decoding after it. */
  prefillMs?: number;
  decodeMs?: number;
}

/** Must match `testTimeout` in vitest.eval.config.ts (VITE_EVAL_TIMEOUT_MS overrides both). A step aborts earlier, so the engine is free for the next case. */
const TEST_TIMEOUT_MS = Number(import.meta.env.VITE_EVAL_TIMEOUT_MS ?? 360_000);
const STEP_TIMEOUT_MS = TEST_TIMEOUT_MS - 20_000;

/**
 * One engine step, as the agent loop makes it, but always a cold start. The engine keeps a KV cache and its own earlier outputs
 * between calls, and a case's prompt must not depend on the case that ran before it, so the engine is reset first. The cost is that
 * a second step is prefilled in full instead of reusing the cache, as it would be in the app.
 */
export async function step(messages: ChatMessage[], options: { forbidToolCalls?: boolean; maxTokens?: number } = {}): Promise<StepResult> {
  await engineClient.reset();
  const req = { messages, maxTokens: options.maxTokens ?? MAX_OUTPUT_TOKENS, thinking: false, forbidToolCalls: options.forbidToolCalls };
  const result = await generateWithTimeout(engineClient, req, STEP_TIMEOUT_MS);
  return {
    raw: result.raw,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    finish: result.finish,
    ms: result.trace?.ms ?? 0,
    prefillMs: result.trace?.prefillMs,
    decodeMs: result.trace?.decodeMs,
    outcome: classify(result.raw),
  };
}

/** Shows a result in the tester page (the top document, since tests run in an iframe) so a browser snapshot can read it. */
export function logToPage(id: string, ok: boolean, detail: string) {
  const doc = (window.top ?? window).document;
  let pre = doc.getElementById("eval-log");
  if (!pre) {
    pre = doc.createElement("pre");
    pre.id = "eval-log";
    pre.style.cssText = "white-space:pre-wrap;font:12px monospace;padding:8px";
    doc.body.prepend(pre);
  }
  pre.textContent += `${ok ? "PASS" : "FAIL"} ${id}\n  ${detail}\n`;
  const w = window.top ?? window;
  ((w as unknown as { __evalResults?: unknown[] }).__evalResults ??= []).push({ id, ok, detail });
}
