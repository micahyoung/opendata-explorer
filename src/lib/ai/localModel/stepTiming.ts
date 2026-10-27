import type { StepProgress } from "./types";

/**
 * Splits one `generate()` call into prefill and decoding. Transformers.js calls `put` once with the prompt before the first
 * forward pass, then once per generated token, and `end` when generation stops. The first token only exists after the prefill, so
 * the gap between the prompt `put` and the next one is the prefill (plus sampling that one token).
 */
export interface StepTimer {
  /** The streamer to pass to `model.generate`. */
  streamer: { put(value: unknown): void; end(): void };
  /** Valid after generation: ms from the start to the first generated token, and from there to the end. */
  result(): { prefillMs: number; decodeMs: number; tokens: number; phase: StepProgress["phase"] };
}

export function createStepTimer(now: () => number = () => performance.now()): StepTimer {
  let start = now();
  let firstToken: number | undefined;
  let end: number | undefined;
  let puts = 0;
  return {
    streamer: {
      put() {
        const t = now();
        if (puts++ === 0) start = t;
        else firstToken ??= t;
      },
      end() {
        end = now();
      },
    },
    result() {
      const stop = end ?? now();
      // No token was generated (aborted or failed during prefill): everything counts as prefill.
      const split = firstToken ?? stop;
      return {
        prefillMs: Math.round(split - start),
        decodeMs: Math.round(stop - split),
        tokens: Math.max(puts - 1, 0),
        phase: firstToken === undefined ? "prefill" : "decode",
      };
    },
  };
}
