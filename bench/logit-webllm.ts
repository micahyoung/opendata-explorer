import { CreateWebWorkerMLCEngine, prebuiltAppConfig, type WebWorkerMLCEngine } from "@mlc-ai/web-llm";

const MODEL = "Qwen3.5-2B-q4f16_1-MLC";
let engine: WebWorkerMLCEngine | undefined;

async function load(ctx = 16384) {
  if (engine) return { cached: true };
  const appConfig = {
    ...prebuiltAppConfig,
    model_list: prebuiltAppConfig.model_list.map((m) => (m.model_id === MODEL ? { ...m, overrides: { ...m.overrides, context_window_size: ctx } } : m)),
  };
  engine = await CreateWebWorkerMLCEngine(new Worker(new URL("./webllm-worker.ts", import.meta.url), { type: "module" }), MODEL, { appConfig });
  return { loaded: true };
}

type Choice = { text?: string; logprobs?: { content?: { token: string; logprob: number; top_logprobs?: { token: string; logprob: number }[] }[] } };

/** Raw-text completion (no chat template) with per-token log-probabilities. WebLLM caps top_logprobs at 5. */
async function complete(text: string, maxTokens = 1, top = 5, temperature = 0, topP?: number) {
  if (!engine) throw new Error("load first");
  const res = (await engine.completions.create({ prompt: text, max_tokens: maxTokens, temperature, ...(topP !== undefined ? { top_p: topP } : {}), logprobs: true, top_logprobs: top, stream: false } as never)) as unknown as { choices: Choice[]; usage?: { prompt_tokens: number } };
  const c = res.choices[0];
  return {
    promptTokens: res.usage?.prompt_tokens,
    generated: c.text,
    tokens: (c.logprobs?.content ?? []).map((t) => ({ token: t.token, p: +Math.exp(t.logprob).toFixed(4), top: (t.top_logprobs ?? []).map((x) => [x.token, +Math.exp(x.logprob).toFixed(4)]) })),
  };
}

/** The same content through the chat API (engine applies its own conversation template), as the agent runs do. */
async function chat(text: string, maxTokens = 1, top = 5, temperature = 0, topP?: number) {
  if (!engine) throw new Error("load first");
  const m = text.match(/^<\|im_start\|>system\n([\s\S]*?)<\|im_end\|>\n<\|im_start\|>user\n([\s\S]*?)<\|im_end\|>\n<\|im_start\|>assistant\n<think>\n\n<\/think>\n\n$/);
  if (!m) throw new Error("text is not a system+user step-1 prompt");
  const res = (await engine.chat.completions.create({
    messages: [{ role: "system", content: m[1] }, { role: "user", content: m[2] }],
    max_tokens: maxTokens, temperature, ...(topP !== undefined ? { top_p: topP } : {}), logprobs: true, top_logprobs: top, stream: false,
    extra_body: { enable_thinking: false },
  } as never)) as unknown as { choices: { message: { content?: string }; logprobs?: Choice["logprobs"] }[]; usage?: { prompt_tokens: number } };
  const c = res.choices[0];
  return {
    promptTokens: res.usage?.prompt_tokens,
    content: c.message.content,
    tokens: (c.logprobs?.content ?? []).map((t) => ({ token: t.token, p: +Math.exp(t.logprob).toFixed(4), top: (t.top_logprobs ?? []).map((x) => [x.token, +Math.exp(x.logprob).toFixed(4)]) })),
  };
}

const saved = () => localStorage.getItem("step1text");
const lw = { load, complete, chat, saved: () => saved()?.length ?? 0, text: () => saved() ?? "" };
(window as unknown as { lw: typeof lw }).lw = lw;
document.getElementById("log")!.textContent += "\nready";
