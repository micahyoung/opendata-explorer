import { beforeEach, describe, expect, it } from "vitest";
import { MAX_LOGGED_STEPS, buildSessionLogFile, useSessionLog } from "./sessionLog";
import type { StepTrace } from "./types";

const trace = (step: number, coldReason?: string): StepTrace => ({
  step,
  startedAt: "2026-01-01T00:00:00.000Z",
  ms: 1,
  ...(coldReason ? { coldReason } : {}),
  thinking: false,
  maxTokens: 10,
  messages: [],
  promptText: `p${step}`,
  fedText: `f${step}`,
  promptTokens: 1,
  reusedTokens: 0,
  fedTokens: 1,
  rawOutput: `r${step}`,
  completionTokens: 1,
  finish: "stop",
});

const steps = () => useSessionLog.getState().steps;

describe("session log", () => {
  beforeEach(() => useSessionLog.getState().clear());

  it("appends steps in order", () => {
    useSessionLog.getState().add(trace(1, "new conversation"));
    useSessionLog.getState().add(trace(2));
    expect(steps().map((s) => s.step)).toEqual([1, 2]);
  });

  it("starts over when a new conversation begins", () => {
    useSessionLog.getState().add(trace(1, "new conversation"));
    useSessionLog.getState().add(trace(2));
    useSessionLog.getState().add(trace(1, "new conversation"));
    expect(steps()).toHaveLength(1);
  });

  it("keeps a cache-miss step in the same conversation", () => {
    useSessionLog.getState().add(trace(1, "new conversation"));
    useSessionLog.getState().add(trace(2, "prefix mismatch"));
    expect(steps()).toHaveLength(2);
  });

  it("keeps only the most recent steps", () => {
    useSessionLog.getState().add(trace(1, "new conversation"));
    for (let i = 2; i <= MAX_LOGGED_STEPS + 10; i++) useSessionLog.getState().add(trace(i));
    expect(steps()).toHaveLength(MAX_LOGGED_STEPS);
    expect(steps().at(-1)?.step).toBe(MAX_LOGGED_STEPS + 10);
  });

  it("builds a file with the header and the steps verbatim", () => {
    const file = buildSessionLogFile([trace(1)], {
      commit: "abc123",
      builtAt: "2026-01-01",
      transformersVersion: "4.3.1",
      capturedAt: "2026-01-02",
    });
    expect(file.app).toEqual({ commit: "abc123", builtAt: "2026-01-01" });
    expect(file.transformersVersion).toBe("4.3.1");
    expect(file.model.id).toContain("Qwen");
    expect(file.steps[0].rawOutput).toBe("r1");
  });
});
