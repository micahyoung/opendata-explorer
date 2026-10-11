import { CreateWebWorkerMLCEngine, prebuiltAppConfig, type WebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { z } from "zod";
import { buildSystemPrompt } from "../src/lib/ai/systemPrompt";
import { tools } from "../src/lib/ai/tools";

type Mode = "none" | "tools-param" | "qwen-in-system";

let current: { key: string; engine: WebWorkerMLCEngine } | undefined;

async function load(modelId: string, ctx?: number) {
  const key = `${modelId}|${ctx}`;
  if (current?.key === key) return { engine: current.engine, loadMs: 0 };
  const t0 = performance.now();
  const appConfig = {
    ...prebuiltAppConfig,
    model_list: prebuiltAppConfig.model_list.map((m) =>
      m.model_id === modelId && ctx ? { ...m, overrides: { ...m.overrides, context_window_size: ctx } } : m,
    ),
  };
  const engine = await CreateWebWorkerMLCEngine(
    new Worker(new URL("./webllm-worker.ts", import.meta.url), { type: "module" }),
    modelId,
    { appConfig },
  );
  current = { key, engine };
  return { engine, loadMs: Math.round(performance.now() - t0) };
}

/** OpenAI-style function descriptors built from the app's real tools. */
function toolDefs(names: string[]) {
  return Object.entries(tools)
    .filter(([name]) => names.includes(name))
    .map(([name, t]) => ({
      type: "function" as const,
      function: {
        name,
        description: (t as { description?: string }).description ?? "",
        parameters: z.toJSONSchema((t as unknown as { inputSchema: z.ZodType }).inputSchema),
      },
    }));
}

/** Qwen3.5's own chat-template tools block (from the chat_template.jinja in the Qwen3.5 model repos). */
function qwenToolsBlock(defs: ReturnType<typeof toolDefs>) {
  return (
    "# Tools\n\nYou have access to the following functions:\n\n<tools>" +
    defs.map((d) => "\n" + JSON.stringify(d)).join("") +
    "\n</tools>" +
    "\n\nIf you choose to call a function ONLY reply in the following format with NO suffix:\n\n<tool_call>\n<function=example_function_name>\n<parameter=example_parameter_1>\nvalue_1\n</parameter>\n<parameter=example_parameter_2>\nThis is the value for the second parameter\nthat can span\nmultiple lines\n</parameter>\n</function>\n</tool_call>\n\n<IMPORTANT>\nReminder:\n- Function calls MUST follow the specified format: an inner <function=...></function> block must be nested within <tool_call></tool_call> XML tags\n- Required parameters MUST be specified\n- You may provide optional reasoning for your function call in natural language BEFORE the function call, but NOT after\n- If there is no function call available, answer the question like normal with your current knowledge and do not tell the user about function calls\n</IMPORTANT>"
  );
}

function describeError(e: unknown, depth = 0): unknown {
  if (!e || typeof e !== "object" || depth > 3) return String(e);
  const o = e as Record<string, unknown>;
  const out: Record<string, unknown> = { name: o.name, message: String(o.message ?? "").slice(0, 600) };
  if (o.cause) out.cause = describeError(o.cause, depth + 1);
  for (const k of Object.keys(o)) if (!["name", "message", "stack", "cause"].includes(k)) out[k] = typeof o[k] === "string" ? (o[k] as string).slice(0, 300) : o[k];
  return out;
}

const eng = {
  load,

  /** One raw engine call. Never throws: errors come back with their full detail. */
  async run(opts: {
    modelId: string;
    ctx?: number;
    mode: Mode;
    toolNames?: string[];
    user?: string;
    maxTokens?: number;
    system?: boolean;
  }) {
    const { engine } = await load(opts.modelId, opts.ctx);
    const defs = toolDefs(opts.toolNames ?? []);
    const base = opts.system === false ? "" : buildSystemPrompt();
    const system = opts.mode === "qwen-in-system" ? `${qwenToolsBlock(defs)}\n\n${base}` : base;
    const messages = [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      { role: "user" as const, content: opts.user ?? "Show noise complaints in Brooklyn from NYC 311." },
    ];
    const t0 = performance.now();
    try {
      const res = await engine.chat.completions.create({
        messages,
        max_tokens: opts.maxTokens ?? 64,
        temperature: 0,
        stream: false,
        ...(opts.mode === "tools-param" ? { tools: defs, tool_choice: "auto" as const } : {}),
        extra_body: { enable_thinking: false },
      } as never);
      const r = res as { choices: { message: { content?: string | null; tool_calls?: unknown }; finish_reason?: string }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
      return {
        ok: true as const,
        ms: Math.round(performance.now() - t0),
        promptTokens: r.usage?.prompt_tokens,
        completionTokens: r.usage?.completion_tokens,
        finish: r.choices[0]?.finish_reason,
        text: r.choices[0]?.message.content ?? "",
        toolCalls: r.choices[0]?.message.tool_calls,
      };
    } catch (e) {
      return { ok: false as const, ms: Math.round(performance.now() - t0), error: describeError(e) };
    }
  },
};

(window as any).eng = eng;
document.getElementById("log")!.textContent += "\nready";
