import { asSchema, Experimental_Agent as ToolLoopAgent, stepCountIs, type FlexibleSchema, type JSONSchema7 } from "ai";
import { MAX_OUTPUT_TOKENS, MAX_TOOL_RESULT_CHARS, MODEL_ID } from "../src/config/localModel";
import type { FunctionTool, LanguageModelPrompt } from "../src/lib/ai/localModel/aiTypes";
import { engineClient } from "../src/lib/ai/localModel/engineClient";
import { createQwenLanguageModel } from "../src/lib/ai/localModel/qwenModel";
import { parseQwenOutput, toQwenMessages } from "../src/lib/ai/localModel/qwenPrompt";
import type { ChatMessage, GenerateRequest, GenerateResult, LocalEngine } from "../src/lib/ai/localModel/types";
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

/** One engine step, exactly as the agent loop makes it. */
export async function step(messages: ChatMessage[]): Promise<StepResult> {
  const result = await engineClient.generate({ messages, maxTokens: MAX_OUTPUT_TOKENS, thinking: false });
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

/** An engine that rewrites the messages before they reach the real one, to try a prompt change without touching app code. */
export const engineWith = (edit: (messages: ChatMessage[]) => ChatMessage[]): LocalEngine => ({
  generate: (req: GenerateRequest, signal?: AbortSignal) => engineClient.generate({ ...req, messages: edit(req.messages) }, signal),
});

export interface AgentRun {
  steps: number;
  calls: { name: string; input: Record<string, unknown>; ok: boolean | undefined }[];
  finalText: string;
  /** The last step produced text and no tool call. */
  completed: boolean;
  /** Identical consecutive tool calls (the loop seen on Baltimore). */
  repeats: number;
  mapped: boolean;
  error?: string;
}

type Step = { toolCalls: { toolCallId: string; toolName: string; input: unknown }[]; toolResults: { toolCallId: string; output: unknown }[]; text: string };

function summarize(steps: Step[], error?: string): AgentRun {
  const calls = steps.flatMap((s) =>
    s.toolCalls.map((c) => {
      const r = s.toolResults.find((x) => x.toolCallId === c.toolCallId)?.output as { success?: boolean } | undefined;
      return { name: c.toolName, input: c.input as Record<string, unknown>, ok: r?.success };
    }),
  );
  const last = steps.at(-1);
  const finalText = last?.text ?? "";
  return {
    steps: steps.length,
    calls,
    finalText,
    completed: !error && !!last && last.toolCalls.length === 0 && finalText.trim().length > 0,
    repeats: calls.filter((c, i) => i > 0 && c.name === calls[i - 1].name && JSON.stringify(c.input) === JSON.stringify(calls[i - 1].input)).length,
    mapped: calls.some((c) => c.name.startsWith("fetch") && c.ok === true),
    error,
  };
}

/**
 * The real agent loop (same model wrapper, instructions, tools and step cap as chatRuntime.ts), run to completion or until `budgetMs`
 * passes. On timeout the loop is aborted (so the engine is free for the next case) and the steps finished so far are returned.
 */
export async function runAgent(question: string, engine: LocalEngine = engineClient, budgetMs = 600_000): Promise<AgentRun> {
  const steps: Step[] = [];
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), budgetMs);
  const agent = new ToolLoopAgent({
    model: createQwenLanguageModel({ engine, modelId: MODEL_ID, maxTokens: MAX_OUTPUT_TOKENS, maxToolResultChars: MAX_TOOL_RESULT_CHARS }),
    instructions: buildSystemPrompt(),
    tools,
    stopWhen: stepCountIs(8),
    onStepFinish: (step) => void steps.push(step as unknown as Step),
  });
  try {
    await agent.generate({ prompt: question, abortSignal: abort.signal });
    return summarize(steps);
  } catch (e) {
    return summarize(steps, abort.signal.aborted ? `timed out after ${budgetMs / 1000}s` : e instanceof Error ? e.message : String(e));
  } finally {
    clearTimeout(timer);
  }
}

export const describeRun = (r: AgentRun) =>
  `${r.error ? `ERROR ${r.error}` : r.completed ? "completed" : "NO ANSWER"}, ${r.steps} steps, ${r.repeats} repeats, ${r.mapped ? "mapped" : "not mapped"}` +
  `\n  calls: ${r.calls.map((c) => `${c.name}${c.ok === false ? "(failed)" : ""}`).join(" > ") || "-"}` +
  `\n  answer: ${r.finalText.replace(/\s+/g, " ").slice(0, 160)}`;
