import { asSchema, type FlexibleSchema, type JSONSchema7 } from "ai";
import { MAX_OUTPUT_TOKENS, MAX_TOOL_RESULT_CHARS } from "../src/config/localModel";
import type { FunctionTool, LanguageModelPrompt } from "../src/lib/ai/localModel/aiTypes";
import { engineClient } from "../src/lib/ai/localModel/engineClient";
import { parseQwenOutput, toQwenMessages } from "../src/lib/ai/localModel/qwenPrompt";
import type { ChatMessage, GenerateResult } from "../src/lib/ai/localModel/types";
import { buildSystemPrompt } from "../src/lib/ai/systemPrompt";
import { tools } from "../src/lib/ai/tools";

/** The app's tools as the AI SDK hands them to the language model: name, description and a JSON schema. */
export const functionTools: FunctionTool[] = Object.entries(tools).map(([name, t]) => ({
  type: "function",
  name,
  description: typeof t.description === "string" ? t.description : undefined,
  inputSchema: asSchema(t.inputSchema as FlexibleSchema<unknown>).jsonSchema as JSONSchema7,
}));

export interface Turn {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
}

/** The messages the engine receives for a conversation: the user's question, then each completed tool call and its result. */
export function buildMessages(user: string, turns: Turn[] = []): ChatMessage[] {
  const prompt: LanguageModelPrompt = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: [{ type: "text", text: user }] },
  ];
  turns.forEach((t, i) => {
    const toolCallId = `call_${i + 1}`;
    prompt.push(
      { role: "assistant", content: [{ type: "tool-call", toolCallId, toolName: t.tool, input: t.input }] },
      { role: "tool", content: [{ type: "tool-result", toolCallId, toolName: t.tool, output: { type: "json", value: t.output as never } }] },
    );
  });
  return toQwenMessages(prompt, functionTools, MAX_TOOL_RESULT_CHARS);
}

export type Outcome = { kind: "text"; text: string } | { kind: "tool_call"; name: string; input: Record<string, unknown> } | { kind: "empty" };

/** What a generation amounts to: a plain-text reply, a tool call, or nothing. */
export function classify(raw: string): Outcome {
  const { text, calls } = parseQwenOutput(raw.replace(/<\|im_end\|>|<\|endoftext\|>/g, ""), functionTools);
  if (calls.length) return { kind: "tool_call", name: calls[0].name, input: calls[0].input };
  return text ? { kind: "text", text } : { kind: "empty" };
}

export interface StepResult extends GenerateResult {
  outcome: Outcome;
}

/**
 * One engine step, as the agent loop makes it, but always a cold start. The engine keeps a KV cache and its own earlier outputs
 * between calls, and a case's prompt must not depend on the case that ran before it, so the engine is reset first. The cost is that
 * a second step is prefilled in full instead of reusing the cache, as it would be in the app.
 */
export async function step(messages: ChatMessage[], options: { forbidToolCalls?: boolean; maxTokens?: number } = {}): Promise<StepResult> {
  await engineClient.reset();
  const result = await engineClient.generate({ messages, maxTokens: options.maxTokens ?? MAX_OUTPUT_TOKENS, thinking: false, forbidToolCalls: options.forbidToolCalls });
  return { ...result, outcome: classify(result.raw) };
}

export const describeOutcome = (o: Outcome) =>
  o.kind === "text" ? `text: ${o.text.slice(0, 200)}` : o.kind === "tool_call" ? `tool_call: ${o.name}(${JSON.stringify(o.input)})` : "empty";

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
