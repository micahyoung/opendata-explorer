import type { JSONSchema7 } from "@ai-sdk/provider";
import type { FunctionTool, LanguageModelPrompt, ToolResultOutput } from "./aiTypes";
import type { ChatMessage } from "./types";

export interface ParsedCall {
  name: string;
  input: Record<string, unknown>;
}

const TOOL_FORMAT_HELP =
  "\n\nIf you choose to call a function ONLY reply in the following format with NO suffix:\n\n<tool_call>\n<function=example_function_name>\n<parameter=example_parameter_1>\nvalue_1\n</parameter>\n<parameter=example_parameter_2>\nThis is the value for the second parameter\nthat can span\nmultiple lines\n</parameter>\n</function>\n</tool_call>\n\n<IMPORTANT>\nReminder:\n- Function calls MUST follow the specified format: an inner <function=...></function> block must be nested within <tool_call></tool_call> XML tags\n- Required parameters MUST be specified\n- You may provide optional reasoning for your function call in natural language BEFORE the function call, but NOT after\n- If there is no function call available, answer the question like normal with your current knowledge and do not tell the user about function calls\n</IMPORTANT>";

/** JSON the way Python's json.dumps renders it (", " and ": " separators), which is what Qwen's chat template emits for tools. */
export function pyJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(pyJson).join(", ")}]`;
  if (v && typeof v === "object") {
    return `{${Object.entries(v)
      .filter(([, x]) => x !== undefined)
      .map(([k, x]) => `${JSON.stringify(k)}: ${pyJson(x)}`)
      .join(", ")}}`;
  }
  return JSON.stringify(v);
}

/** Qwen3.5's chat-template tools block (one OpenAI-style descriptor per line), byte-identical to the official template. */
export function qwenToolsBlock(tools: FunctionTool[]): string {
  const lines = tools.map((t) =>
    pyJson({ type: "function", function: { name: t.name, description: t.description ?? "", parameters: t.inputSchema } }),
  );
  return "# Tools\n\nYou have access to the following functions:\n\n<tools>" + lines.map((l) => "\n" + l).join("") + "\n</tools>" + TOOL_FORMAT_HELP;
}

function stringifyParam(v: unknown): string {
  return typeof v === "string" ? v : JSON.stringify(v);
}

function formatCall(name: string, input: unknown): string {
  const obj = (typeof input === "string" ? safeJson(input) : input) as Record<string, unknown> | undefined;
  const params = Object.entries(obj ?? {})
    .map(([k, v]) => `<parameter=${k}>\n${stringifyParam(v)}\n</parameter>`)
    .join("\n");
  return `<tool_call>\n<function=${name}>${params ? "\n" + params : ""}\n</function>\n</tool_call>`;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/** Cap what the model sees from one tool result; the tool itself still returns (and the UI still gets) the full output. */
export function capResult(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n[output truncated: ${text.length - maxChars} of ${text.length} characters omitted]`;
}

function resultText(o: ToolResultOutput): string {
  switch (o.type) {
    case "text":
    case "error-text":
      return o.value;
    case "json":
    case "error-json":
      return JSON.stringify(o.value);
    case "execution-denied":
      return `Execution denied${o.reason ? `: ${o.reason}` : ""}`;
    default:
      return JSON.stringify(o);
  }
}

/** AI SDK prompt -> Qwen chat messages. Tool results become a user turn of <tool_response> blocks, as in Qwen's template. */
export function toQwenMessages(
  prompt: LanguageModelPrompt,
  tools: FunctionTool[],
  maxResultChars = Infinity,
): ChatMessage[] {
  const out: ChatMessage[] = [];
  const toolsBlock = tools.length ? qwenToolsBlock(tools) : "";
  let sawSystem = false;
  for (const m of prompt) {
    if (m.role === "system") {
      out.push({ role: "system", content: toolsBlock ? `${toolsBlock}\n\n${m.content}` : m.content });
      sawSystem = true;
    } else if (m.role === "user") {
      out.push({ role: "user", content: m.content.map((p) => (p.type === "text" ? p.text : "")).join("") });
    } else if (m.role === "assistant") {
      // Re-rendered from the parsed result; the engine swaps in the model's exact earlier output when it still holds it.
      const text = m.content.map((p) => (p.type === "text" ? p.text : "")).join("");
      const calls = m.content.flatMap((p) => (p.type === "tool-call" ? [formatCall(p.toolName, p.input)] : []));
      out.push({ role: "assistant", content: [text.trim(), ...calls].filter(Boolean).join("\n\n") });
    } else {
      const blocks = m.content.flatMap((p) => (p.type === "tool-result" ? [`<tool_response>\n${capResult(resultText(p.output), maxResultChars)}\n</tool_response>`] : []));
      out.push({ role: "user", content: blocks.join("\n") });
    }
  }
  if (!sawSystem && toolsBlock) out.unshift({ role: "system", content: toolsBlock });
  return out;
}

function coerce(raw: string, schema: JSONSchema7 | undefined): unknown {
  const value = raw.replace(/^\n/, "").replace(/\n$/, "");
  const type = schema?.type;
  if (type === "string") return value;
  const parsed = safeJson(value.trim());
  if (typeof parsed === "number" && schema) {
    const max = typeof schema.maximum === "number" ? schema.maximum : undefined;
    const min = typeof schema.minimum === "number" ? schema.minimum : undefined;
    return Math.min(max ?? parsed, Math.max(min ?? parsed, parsed));
  }
  if (parsed !== undefined) return parsed;
  return value;
}

/** Parses Qwen XML tool calls leniently (tolerates a missing </function> or </tool_call>) and returns the leading text. */
export function parseQwenOutput(
  raw: string,
  tools: FunctionTool[],
): { text: string; calls: ParsedCall[] } {
  const closeIdx = raw.lastIndexOf("</think>");
  const unthought = closeIdx >= 0 ? raw.slice(closeIdx + "</think>".length) : raw.includes("<think>") ? "" : raw;
  const cleaned = unthought.replace(/<think>[\s\S]*?<\/think>/g, "");
  const first = cleaned.indexOf("<tool_call>");
  const fnStart = cleaned.indexOf("<function=");
  const cut = first >= 0 ? first : fnStart;
  const text = (cut >= 0 ? cleaned.slice(0, cut) : cleaned).trim();
  const calls: ParsedCall[] = [];
  if (cut < 0) return { text, calls };
  const body = cleaned.slice(cut);
  const fnRe = /<function=([^>\s]+)>([\s\S]*?)(?=<function=|<\/tool_call>|$)/g;
  for (const m of body.matchAll(fnRe)) {
    const name = m[1];
    const schema = tools.find((t) => t.name === name)?.inputSchema as JSONSchema7 | undefined;
    const input: Record<string, unknown> = {};
    for (const p of m[2].matchAll(/<parameter=([^>\s]+)>([\s\S]*?)(?:<\/parameter>|(?=<parameter=)|(?=<\/function>)|$)/g)) {
      const propSchema = (schema?.properties?.[p[1]] ?? undefined) as JSONSchema7 | undefined;
      input[p[1]] = coerce(p[2], propSchema);
    }
    calls.push({ name, input });
  }
  return { text, calls };
}
