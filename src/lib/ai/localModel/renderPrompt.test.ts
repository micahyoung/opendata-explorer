import { describe, expect, it } from "vitest";
import { generationHeader, planPrompt, renderChatml, type Generation } from "./renderPrompt";
import type { ChatMessage } from "./types";

const sys: ChatMessage = { role: "system", content: "S" };
const user: ChatMessage = { role: "user", content: "U" };
const asst = (content: string): ChatMessage => ({ role: "assistant", content });
const tool: ChatMessage = { role: "user", content: "<tool_response>\nR\n</tool_response>" };

const header = generationHeader(false);
const RAW = "<tool_call>\n<function=f>\n</function>\n</tool_call><|im_end|>";

describe("generationHeader", () => {
  it("pre-closes the think block unless thinking is on", () => {
    expect(generationHeader(false)).toBe("<|im_start|>assistant\n<think>\n\n</think>\n\n");
    expect(generationHeader(true)).toBe("<|im_start|>assistant\n<think>\n");
  });
});

describe("renderChatml", () => {
  it("ends with the generation header", () => {
    expect(renderChatml([sys, user], [], false)).toBe(`<|im_start|>system\nS<|im_end|>\n<|im_start|>user\nU<|im_end|>\n${header}`);
  });

  it("substitutes the model's raw output for a re-rendered assistant turn", () => {
    const gens: Generation[] = [{ header, raw: RAW }];
    const text = renderChatml([sys, user, asst("re-rendered"), tool], gens, false);
    expect(text).toContain(`${header}${RAW}\n<|im_start|>user\n<tool_response>`);
    expect(text).not.toContain("re-rendered");
  });

  it("closes a raw turn that lacks <|im_end|>", () => {
    const text = renderChatml([user, asst("x")], [{ header, raw: "cut off" }], false);
    expect(text).toContain(`${header}cut off<|im_end|>\n`);
  });
});

describe("planPrompt", () => {
  const first = planPrompt([sys, user], [], undefined, false);

  it("is cold for a new conversation", () => {
    expect(first.cold).toBe("new conversation");
  });

  it("is warm when the new prompt extends the cached text exactly", () => {
    const gens: Generation[] = [{ header, raw: RAW }];
    const cachedText = first.text + RAW;
    const plan = planPrompt([sys, user, asst("re-rendered"), tool], gens, cachedText, false);
    expect(plan.cold).toBeUndefined();
    expect(plan.text.startsWith(cachedText)).toBe(true);
  });

  it("is cold when the number of assistant turns differs from what the engine generated", () => {
    const plan = planPrompt([sys, user, asst("a"), tool], [], first.text, false);
    expect(plan.cold).toBe("assistant turn count mismatch");
  });

  it("is cold when the history was edited", () => {
    const gens: Generation[] = [{ header, raw: RAW }];
    const plan = planPrompt([sys, { role: "user", content: "different" }, asst("a"), tool], gens, first.text + RAW, false);
    expect(plan.cold).toBe("prefix mismatch");
  });

  it("is cold when nothing is cached", () => {
    const plan = planPrompt([sys, user, asst("a"), tool], [{ header, raw: RAW }], undefined, false);
    expect(plan.cold).toBe("prefix mismatch");
  });

  it("does not put another history's raw output into a cold prefill", () => {
    const gens: Generation[] = [{ header, raw: RAW }];
    const edited = [sys, { role: "user", content: "different" }, asst("a"), tool] satisfies ChatMessage[];
    const plan = planPrompt(edited, gens, first.text + RAW, false);
    expect(plan.cold).toBe("prefix mismatch");
    expect(plan.text).toBe(renderChatml(edited, [], false));
    expect(plan.text).not.toContain(RAW);
  });

  it("renders a cold prefill with no cache the same way", () => {
    const messages = [sys, user, asst("a"), tool] satisfies ChatMessage[];
    const plan = planPrompt(messages, [{ header, raw: RAW }], undefined, false);
    expect(plan.text).toBe(renderChatml(messages, [], false));
  });
});
