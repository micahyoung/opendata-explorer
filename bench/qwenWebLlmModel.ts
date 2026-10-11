import type {
  JSONSchema7,
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3FunctionTool,
  LanguageModelV3Prompt,
  LanguageModelV3StreamPart,
  LanguageModelV3ToolResultOutput,
} from "@ai-sdk/provider";

/** The slice of MLCEngine / WebWorkerMLCEngine this model needs. */
export interface ChatEngine {
  chat: { completions: { create(req: never): Promise<unknown> } };
}

interface ParsedCall {
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

/** Qwen3.5's chat-template tools block (one OpenAI-style descriptor per line). `spaced` matches the official template's JSON spacing. */
export function qwenToolsBlock(tools: LanguageModelV3FunctionTool[], spaced = false): string {
  const stringify = spaced ? pyJson : JSON.stringify;
  const lines = tools.map((t) =>
    stringify({ type: "function", function: { name: t.name, description: t.description ?? "", parameters: t.inputSchema } }),
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

function resultText(o: LanguageModelV3ToolResultOutput): string {
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

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** AI SDK prompt -> Qwen chat messages. Tool results become a user turn of <tool_response> blocks, as in Qwen's template. */
export function toQwenMessages(
  prompt: LanguageModelV3Prompt,
  tools: LanguageModelV3FunctionTool[],
  maxResultChars = Infinity,
  rawByCallId?: Map<string, string>,
  spacedToolJson = false,
): ChatMessage[] {
  const out: ChatMessage[] = [];
  const toolsBlock = tools.length ? qwenToolsBlock(tools, spacedToolJson) : "";
  let sawSystem = false;
  for (const m of prompt) {
    if (m.role === "system") {
      out.push({ role: "system", content: toolsBlock ? `${toolsBlock}\n\n${m.content}` : m.content });
      sawSystem = true;
    } else if (m.role === "user") {
      out.push({ role: "user", content: m.content.map((p) => (p.type === "text" ? p.text : "")).join("") });
    } else if (m.role === "assistant") {
      // Replay the model's exact earlier output so WebLLM sees the conversation it already holds and reuses its KV cache.
      const replay = m.content.flatMap((p) => (p.type === "tool-call" ? [rawByCallId?.get(p.toolCallId)] : [])).find((r) => r !== undefined);
      if (replay !== undefined) {
        out.push({ role: "assistant", content: replay });
        continue;
      }
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
  tools: LanguageModelV3FunctionTool[],
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

export interface QwenWebLlmOptions {
  engine: ChatEngine;
  modelId: string;
  maxTokens?: number;
  /** Enable Qwen's thinking mode. Thinking text is stripped from the output. */
  thinking?: boolean;
  /** Extra chat-completion sampling params (temperature, top_p, presence_penalty, seed). */
  sampling?: { temperature?: number; top_p?: number; presence_penalty?: number; seed?: number };
  /** Omit enable_thinking from the request (use when a conv_config override opens <think> itself). */
  omitEnableThinking?: boolean;
  /** Max characters of any single tool result shown to the model (default: no cap). */
  maxToolResultChars?: number;
  /** Render the tools block's JSON with Python-style spacing, as the official chat template does. */
  spacedToolJson?: boolean;
  /** Called with raw-output stats after each completion (no text). */
  onStats?: (s: { rawChars: number; thinkChars: number; completionTokens?: number; finish?: string; closedThink: boolean }) => void;
}

export function createQwenWebLlmModel({ engine, modelId, maxTokens = 1024, thinking = false, sampling = {}, omitEnableThinking = false, maxToolResultChars = Infinity, spacedToolJson = false, onStats }: QwenWebLlmOptions): LanguageModelV3 {
  const rawByCallId = new Map<string, string>();
  let callSeq = 0;

  async function complete(options: LanguageModelV3CallOptions) {
    const tools = (options.tools ?? []).filter((t): t is LanguageModelV3FunctionTool => t.type === "function");
    const messages = toQwenMessages(options.prompt, tools, maxToolResultChars, rawByCallId, spacedToolJson);
    const res = (await engine.chat.completions.create({
      messages,
      max_tokens: options.maxOutputTokens ?? maxTokens,
      temperature: options.temperature ?? sampling.temperature ?? 0,
      ...(sampling.top_p !== undefined ? { top_p: sampling.top_p } : {}),
      ...(sampling.presence_penalty !== undefined ? { presence_penalty: sampling.presence_penalty } : {}),
      ...(sampling.seed !== undefined ? { seed: sampling.seed } : {}),
      stream: false,
      ...(omitEnableThinking ? {} : { extra_body: { enable_thinking: thinking } }),
    } as never)) as {
      choices: { message: { content?: string | null }; finish_reason?: string }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    const raw = res.choices[0]?.message.content ?? "";
    const parsed = parseQwenOutput(raw, tools);
    const callIds = parsed.calls.map(() => `call_${++callSeq}`);
    for (const id of callIds) rawByCallId.set(id, raw);
    const ci = raw.lastIndexOf("</think>");
    onStats?.({ rawChars: raw.length, thinkChars: ci >= 0 ? ci : raw.includes("<think>") ? raw.length : 0, completionTokens: res.usage?.completion_tokens, finish: res.choices[0]?.finish_reason, closedThink: ci >= 0 });
    const finish = res.choices[0]?.finish_reason;
    const unified = parsed.calls.length ? ("tool-calls" as const) : finish === "length" ? ("length" as const) : ("stop" as const);
    return { parsed, unified, raw: finish, usage: res.usage, callIds };
  }

  const usageOf = (u?: { prompt_tokens: number; completion_tokens: number }) => ({
    inputTokens: { total: u?.prompt_tokens, noCache: u?.prompt_tokens, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: u?.completion_tokens, text: u?.completion_tokens, reasoning: undefined },
  });

  return {
    specificationVersion: "v3",
    provider: "webllm-qwen",
    modelId,
    supportedUrls: {},

    async doGenerate(options) {
      const { parsed, unified, raw, usage, callIds } = await complete(options);
      return {
        content: [
          ...(parsed.text ? [{ type: "text" as const, text: parsed.text }] : []),
          ...parsed.calls.map((c, i) => ({
            type: "tool-call" as const,
            toolCallId: callIds[i],
            toolName: c.name,
            input: JSON.stringify(c.input),
          })),
        ],
        finishReason: { unified, raw },
        usage: usageOf(usage),
        warnings: [],
      };
    },

    async doStream(options) {
      const { parsed, unified, raw, usage, callIds } = await complete(options);
      const parts: LanguageModelV3StreamPart[] = [{ type: "stream-start", warnings: [] }];
      if (parsed.text) {
        parts.push({ type: "text-start", id: "t0" }, { type: "text-delta", id: "t0", delta: parsed.text }, { type: "text-end", id: "t0" });
      }
      parsed.calls.forEach((c, i) =>
        parts.push({ type: "tool-call", toolCallId: callIds[i], toolName: c.name, input: JSON.stringify(c.input) }),
      );
      parts.push({ type: "finish", usage: usageOf(usage), finishReason: { unified, raw } });
      return {
        stream: new ReadableStream<LanguageModelV3StreamPart>({
          start(controller) {
            for (const p of parts) controller.enqueue(p);
            controller.close();
          },
        }),
      };
    },
  };
}
