import { describe, expect, it } from "vitest";
import { isRepeatedCall, type GuardStep } from "./loopGuard";

const ok = { success: true };
const step = (calls: Array<[string, unknown]>, output: unknown = ok): GuardStep => ({
  toolCalls: calls.map(([toolName, input]) => ({ toolName, input })),
  toolResults: calls.map(() => ({ output })),
});
const text: GuardStep = { toolCalls: [], toolResults: [] };

const A = step([["fetch", { url: "a", where: "1=1" }]]);

describe("isRepeatedCall", () => {
  it("is false with no steps or a text-only step", () => {
    expect(isRepeatedCall([])).toBe(false);
    expect(isRepeatedCall([A, text])).toBe(false);
  });

  it("is false for a first call", () => {
    expect(isRepeatedCall([A])).toBe(false);
  });

  it("catches an identical consecutive repeat", () => {
    expect(isRepeatedCall([A, step([["fetch", { url: "a", where: "1=1" }]])])).toBe(true);
  });

  it("catches a non-consecutive repeat (A, B, A)", () => {
    const B = step([["other", {}]]);
    expect(isRepeatedCall([A, B, A])).toBe(true);
  });

  it("is false when the arguments differ", () => {
    expect(isRepeatedCall([A, step([["fetch", { url: "a", where: "x=1" }]])])).toBe(false);
  });

  it("ignores argument key order", () => {
    expect(isRepeatedCall([A, step([["fetch", { where: "1=1", url: "a" }]])])).toBe(true);
  });

  it("treats parallel calls as a set", () => {
    const AB = step([["f", { a: 1 }], ["g", { b: 2 }]]);
    const BA = step([["g", { b: 2 }], ["f", { a: 1 }]]);
    expect(isRepeatedCall([AB, BA])).toBe(true);
    expect(isRepeatedCall([step([["f", { a: 1 }]]), BA])).toBe(false);
  });

  it("does not count a failed earlier call (retrying is legitimate)", () => {
    const failed = step([["fetch", { url: "a", where: "1=1" }]], { success: false, error: "boom" });
    expect(isRepeatedCall([failed, A])).toBe(false);
  });

  it("does not count an earlier call that errored", () => {
    const errored: GuardStep = { ...A, toolResults: [], content: [{ type: "tool-error" }] };
    expect(isRepeatedCall([errored, A])).toBe(false);
  });
});
