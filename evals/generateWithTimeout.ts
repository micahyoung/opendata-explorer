import { progressOf, type GenerateRequest, type GenerateResult, type LocalEngine } from "../src/lib/ai/localModel/types";

/**
 * Runs one engine step and aborts it after `timeoutMs`. The abort reaches the worker, which stops generating and resets, and the
 * returned promise only settles once the worker has answered. Without this, a case cut off by the test timeout leaves the worker
 * busy and every following case fails with "The model is already generating." The error carries the engine's progress as JSON
 * (phase, timings, token count, the full partial output) when the engine reports it.
 */
export async function generateWithTimeout(engine: LocalEngine, req: GenerateRequest, timeoutMs: number): Promise<GenerateResult> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await engine.generate(req, controller.signal);
  } catch (e) {
    if (timedOut) {
      const progress = progressOf(e);
      throw new Error(
        `The step did not finish within ${Math.round(timeoutMs / 1000)} s, so it was aborted and the engine reset.${progress ? ` Progress: ${JSON.stringify(progress)}` : ""}`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
