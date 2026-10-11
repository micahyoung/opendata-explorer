import { beforeEach, describe, expect, it } from "vitest";
import { MAX_LOGGED_STEPS, buildSessionLogFile, countSteps, useSessionLog } from "./sessionLog";
import type { ChatMessage, StepTrace } from "./types";

const trace = (step: number, rawOutput: string, coldReason?: string): StepTrace => ({
  step,
  startedAt: "2026-01-01T00:00:00.000Z",
  ms: 1000,
  ...(coldReason ? { coldReason } : {}),
  promptTokens: 10,
  reusedTokens: 0,
  fedTokens: 10,
  rawOutput,
  completionTokens: 5,
  finish: "stop",
});
const req = (messages: ChatMessage[]) => ({ messages, maxTokens: 10, thinking: false });
const call = (name: string, k: string, v: string) =>
  `<tool_call>\n<function=${name}>\n<parameter=${k}>\n${v}\n</parameter>\n</function>\n</tool_call><|im_end|>`;
const add = (messages: ChatMessage[], t: StepTrace) => useSessionLog.getState().add(req(messages), t);
const events = () => useSessionLog.getState().events;

const SYS: ChatMessage = { role: "system", content: "SYSTEM" };
const Q: ChatMessage = { role: "user", content: "hello" };

describe("session log", () => {
  beforeEach(() => useSessionLog.getState().clear());

  it("logs the system prompt once and the first exchange", () => {
    add([SYS, Q], trace(1, "Hi there<|im_end|>", "new conversation"));
    expect(useSessionLog.getState().system).toBe("SYSTEM");
    expect(events().map((e) => e.type)).toEqual(["user", "assistant"]);
    expect(events()[0].message.content).toEqual([{ type: "text", text: "hello" }]);
    expect(events()[1].message.content).toEqual([{ type: "text", text: "Hi there" }]);
    expect(events()[1].rawOutput).toBe("Hi there<|im_end|>");
    expect(events()[1].engine).toMatchObject({ step: 1, coldReason: "new conversation", promptTokens: 10 });
  });

  it("pairs tool results with the previous tool_use and never repeats a message", () => {
    const a1: ChatMessage = { role: "assistant", content: "re-rendered" };
    const tr: ChatMessage = { role: "user", content: "<tool_response>\nRESULT\n</tool_response>" };
    add([SYS, Q], trace(1, call("find", "q", "oaks"), "new conversation"));
    add([SYS, Q, a1, tr], trace(2, "Done<|im_end|>"));
    const e = events();
    expect(e.map((x) => x.type)).toEqual(["user", "assistant", "user", "assistant"]);
    const use = e[1].message.content[0];
    expect(use).toMatchObject({ type: "tool_use", name: "find", input: { q: "oaks" } });
    expect(e[2].message.content).toEqual([{ type: "tool_result", tool_use_id: (use as { id: string }).id, content: "RESULT" }]);
    expect(e.map((x) => x.parentUuid)).toEqual([null, e[0].uuid, e[1].uuid, e[2].uuid]);
    expect(JSON.stringify(e)).not.toContain("re-rendered");
  });

  it("turns text plus two calls into one assistant event with three blocks", () => {
    const raw = "Looking.\n\n" + call("a", "x", "1").replace("<|im_end|>", "") + "\n" + call("b", "y", "z");
    add([SYS, Q], trace(1, raw, "new conversation"));
    expect(events()[1].message.content.map((b) => b.type)).toEqual(["text", "tool_use", "tool_use"]);
  });

  it("starts over on a new conversation but keeps cache misses in place", () => {
    add([SYS, Q], trace(1, "a", "new conversation"));
    add([SYS, Q, { role: "assistant", content: "a" }, { role: "user", content: "again" }], trace(2, "b", "prefix mismatch"));
    expect(countSteps(events())).toBe(2);
    add([{ role: "system", content: "S2" }, Q], trace(1, "c", "new conversation"));
    expect(countSteps(events())).toBe(1);
    expect(useSessionLog.getState().system).toBe("S2");
  });

  it("keeps only the most recent steps", () => {
    const msgs: ChatMessage[] = [SYS, Q];
    add(msgs, trace(1, "r1", "new conversation"));
    for (let i = 2; i <= MAX_LOGGED_STEPS + 10; i++) {
      msgs.push({ role: "assistant", content: "x" }, { role: "user", content: `q${i}` });
      add([...msgs], trace(i, `r${i}`));
    }
    expect(countSteps(events())).toBe(MAX_LOGGED_STEPS);
    expect(events()[0].parentUuid).toBeNull();
    expect(events().at(-1)?.rawOutput).toBe(`r${MAX_LOGGED_STEPS + 10}`);
  });

  it("builds a file with header, system and events that round-trips as JSON", () => {
    add([SYS, Q], trace(1, "ok", "new conversation"));
    const file = buildSessionLogFile(useSessionLog.getState(), { commit: "abc", builtAt: "b", transformersVersion: "4.3.1", capturedAt: "c" });
    expect(file).toMatchObject({ app: { commit: "abc" }, transformersVersion: "4.3.1", system: "SYSTEM" });
    expect(file.model.id).toContain("Qwen");
    expect(JSON.parse(JSON.stringify(file)).events).toHaveLength(2);
  });
});
