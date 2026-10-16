import { describe, expect, it, vi } from "vitest";
import { createQwenLanguageModel } from "./qwenModel";
import type { GenerateRequest, LocalEngine } from "./types";

function setup() {
  const generate = vi.fn<LocalEngine["generate"]>(async () => ({ raw: "done", promptTokens: 1, completionTokens: 1, finish: "stop" }));
  const model = createQwenLanguageModel({ engine: { generate }, modelId: "m", maxTokens: 10, maxToolResultChars: 100 });
  const call = (toolChoice?: { type: "auto" | "none" | "required" }) =>
    model.doGenerate({ prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }], toolChoice } as never);
  const lastRequest = (): GenerateRequest => generate.mock.calls.at(-1)![0];
  return { call, lastRequest };
}

describe("createQwenLanguageModel toolChoice", () => {
  it("forbids tool calls when toolChoice is none", async () => {
    const { call, lastRequest } = setup();
    await call({ type: "none" });
    expect(lastRequest().forbidToolCalls).toBe(true);
  });

  it("allows tool calls by default or with auto", async () => {
    const { call, lastRequest } = setup();
    await call();
    expect(lastRequest().forbidToolCalls).toBe(false);
    await call({ type: "auto" });
    expect(lastRequest().forbidToolCalls).toBe(false);
  });
});
