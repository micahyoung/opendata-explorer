import { describe, expect, it } from "vitest";
import { createStepTimer } from "./stepTiming";
import { abortedWith, progressOf, type StepProgress } from "./types";

function clock(...times: number[]) {
  let i = 0;
  return () => times[Math.min(i++, times.length - 1)];
}

describe("createStepTimer", () => {
  it("times the prefill up to the first token and decoding from there to the end", () => {
    // created at 0, prompt put at 10, first token at 110, second at 130, end at 150
    const timer = createStepTimer(clock(0, 10, 110, 130, 150, 150));
    timer.streamer.put([[1n]]);
    timer.streamer.put([[2n]]);
    timer.streamer.put([[3n]]);
    timer.streamer.end();
    expect(timer.result()).toEqual({ prefillMs: 100, decodeMs: 40, tokens: 2, phase: "decode" });
  });

  it("counts everything as prefill when no token was generated", () => {
    const timer = createStepTimer(clock(0, 10, 90, 90));
    timer.streamer.put([[1n]]);
    timer.streamer.end();
    expect(timer.result()).toEqual({ prefillMs: 80, decodeMs: 0, tokens: 0, phase: "prefill" });
  });

  it("reports a step that was interrupted mid-decode, before end() was called", () => {
    // prompt put at 10, first token at 60, a second at 80, read at 200 without end()
    const timer = createStepTimer(clock(0, 10, 60, 80, 200));
    timer.streamer.put([[1n]]);
    timer.streamer.put([[2n]]);
    timer.streamer.put([[3n]]);
    expect(timer.result()).toEqual({ prefillMs: 50, decodeMs: 140, tokens: 2, phase: "decode" });
  });
});

const progress: StepProgress = { phase: "decode", elapsedMs: 220_000, prefillMs: 5_100, tokens: 118, partial: "<tool_call>\n<function=fetchArcGisData>" };

describe("abortedWith / progressOf", () => {
  it("is an AbortError that callers already recognise, and carries the progress", () => {
    const e = abortedWith(progress);
    expect(e).toBeInstanceOf(DOMException);
    expect(e.name).toBe("AbortError");
    expect(progressOf(e)).toEqual(progress);
  });

  it("is a plain AbortError when there is no progress", () => {
    const e = abortedWith();
    expect(e.name).toBe("AbortError");
    expect(progressOf(e)).toBeUndefined();
  });

  it("finds nothing on other errors or values", () => {
    expect(progressOf(new Error("x"))).toBeUndefined();
    expect(progressOf(undefined)).toBeUndefined();
    expect(progressOf("progress")).toBeUndefined();
  });
});
