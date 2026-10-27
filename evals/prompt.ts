import { asSchema, type FlexibleSchema, type JSONSchema7 } from "ai";
import { MAX_TOOL_RESULT_CHARS } from "../src/config/localModel";
import type { FunctionTool, LanguageModelPrompt } from "../src/lib/ai/localModel/aiTypes";
import { parseQwenOutput, toQwenMessages } from "../src/lib/ai/localModel/qwenPrompt";
import type { ChatMessage } from "../src/lib/ai/localModel/types";
import { buildSystemPrompt } from "../src/lib/ai/systemPrompt";
import { tools } from "../src/lib/ai/tools";
import type { Outcome } from "./grade";

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

/** A later exchange: the assistant's reply to the turns so far, then another user message (one text part per entry). */
export interface FollowUp {
  assistant: string;
  user: string[];
}

/** The messages the engine receives for a conversation: the user's question, each completed tool call and its result, then an optional follow-up. */
export function buildMessages(user: string, turns: Turn[] = [], followUp?: FollowUp): ChatMessage[] {
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
  if (followUp) {
    prompt.push(
      { role: "assistant", content: [{ type: "text", text: followUp.assistant }] },
      { role: "user", content: followUp.user.map((text) => ({ type: "text" as const, text })) },
    );
  }
  return toQwenMessages(prompt, functionTools, MAX_TOOL_RESULT_CHARS);
}

/** What a generation amounts to: a plain-text reply, a tool call, or nothing. */
export function classify(raw: string): Outcome {
  const { text, calls } = parseQwenOutput(raw.replace(/<\|im_end\|>|<\|endoftext\|>/g, ""), functionTools);
  if (calls.length) return { kind: "tool_call", name: calls[0].name, input: calls[0].input };
  return text ? { kind: "text", text } : { kind: "empty" };
}

export const describeOutcome = (o: Outcome) =>
  o.kind === "text" ? `text: ${o.text.slice(0, 200)}` : o.kind === "tool_call" ? `tool_call: ${o.name}(${JSON.stringify(o.input)})` : "empty";
