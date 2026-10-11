import { CreateWebWorkerMLCEngine, prebuiltAppConfig } from "@mlc-ai/web-llm";
import { asSchema } from "ai";
import { buildSystemPrompt } from "../src/lib/ai/systemPrompt";
import { tools } from "../src/lib/ai/tools";
import { qwenToolsBlock } from "./qwenWebLlmModel";

const MODEL = "Qwen3.5-2B-q4f16_1-MLC";
type Msg = { role: "system" | "user" | "assistant"; content: string };

async function engineFor(ctx: number) {
  const appConfig = {
    ...prebuiltAppConfig,
    model_list: prebuiltAppConfig.model_list.map((m) =>
      m.model_id === MODEL ? { ...m, overrides: { ...m.overrides, context_window_size: ctx } } : m,
    ),
  };
  return CreateWebWorkerMLCEngine(new Worker(new URL("./webllm-worker.ts", import.meta.url), { type: "module" }), MODEL, { appConfig });
}

function realSystem(): string {
  const fts = Object.entries(tools).map(([name, t]) => ({
    type: "function" as const,
    name,
    description: (t as { description?: string }).description,
    inputSchema: asSchema((t as unknown as { inputSchema: never }).inputSchema).jsonSchema,
  }));
  return `${qwenToolsBlock(fts as never)}\n\n${buildSystemPrompt()}`;
}

async function call(engine: Awaited<ReturnType<typeof engineFor>>, messages: Msg[]) {
  const t0 = performance.now();
  const res = (await engine.chat.completions.create({ messages, max_tokens: 8, temperature: 0, stream: false } as never)) as {
    choices: { message: { content?: string | null } }[];
    usage?: { prompt_tokens: number; extra?: Record<string, number> };
  };
  return { text: res.choices[0]?.message.content ?? "", ms: Math.round(performance.now() - t0), promptTokens: res.usage?.prompt_tokens, extra: res.usage?.extra };
}

/** Does WebLLM reuse the KV cache between requests? Times a series of related requests on one engine. */
const kv = {
  async run(ctx = 16384) {
    const engine = await engineFor(ctx);
    const sys = realSystem();
    const u1 = "Which dataset has NYC 311 service requests?";
    const u2 = "Thanks. And which one has SF street trees?";
    const out: Record<string, unknown>[] = [];
    const rec = (label: string, r: Awaited<ReturnType<typeof call>>) =>
      out.push({ label, ms: r.ms, promptTokens: r.promptTokens, prefillTps: r.extra?.prefill_tokens_per_s, ttft: r.extra?.time_to_first_token_s });
    (window as unknown as { __kvOut: unknown }).__kvOut = out;

    const A = await call(engine, [{ role: "system", content: sys }, { role: "user", content: u1 }]);
    rec("A cold", A);
    rec("B identical to A", await call(engine, [{ role: "system", content: sys }, { role: "user", content: u1 }]));
    rec("C extends A with exact reply", await call(engine, [{ role: "system", content: sys }, { role: "user", content: u1 }, { role: "assistant", content: A.text }, { role: "user", content: u2 }]));
    rec("D extends C-like but reply rewritten", await call(engine, [{ role: "system", content: sys }, { role: "user", content: u1 }, { role: "assistant", content: "Let me check." }, { role: "user", content: u2 }]));
    rec("E same system, different user", await call(engine, [{ role: "system", content: sys }, { role: "user", content: "How many trees are in DC?" }]));
    rec("F cold (system changed at start)", await call(engine, [{ role: "system", content: "x " + sys }, { role: "user", content: u1 }]));
    return out;
  },
};

(window as unknown as { kv: typeof kv }).kv = kv;
document.getElementById("log")!.textContent += "\nready";
