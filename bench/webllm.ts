import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { webLLM } from "@browser-ai/web-llm";
import { prebuiltAppConfig } from "@mlc-ai/web-llm";
import { buildSystemPrompt } from "../src/lib/ai/systemPrompt";
import { tools } from "../src/lib/ai/tools";
import { benchPrompts } from "./prompts";
import { runOne } from "./run-one";

const NO_THINK = { "web-llm": { extra_body: { enable_thinking: false } } } as never;

let current: { key: string; model: ReturnType<typeof webLLM> } | undefined;

async function load(modelId: string, ctx?: number) {
  const key = `${modelId}|${ctx}`;
  if (current?.key === key) return { model: current.model, loadMs: 0 };
  const t0 = performance.now();
  const appConfig = {
    ...prebuiltAppConfig,
    model_list: prebuiltAppConfig.model_list.map((m) =>
      m.model_id === modelId && ctx ? { ...m, overrides: { ...m.overrides, context_window_size: ctx } } : m,
    ),
  };
  const model = webLLM(modelId, {
    appConfig,
    worker: new Worker(new URL("./webllm-worker.ts", import.meta.url), { type: "module" }),
  });
  await (model as never as { createSessionWithProgress: () => Promise<unknown> }).createSessionWithProgress();
  current = { key, model };
  return { model, loadMs: Math.round(performance.now() - t0) };
}

const wl = {
  load,

  /** plain / tool / longprompt, mirroring smoke() in bench.ts */
  async smoke(modelId: string, kind: "plain" | "tool" | "longprompt", ctx?: number) {
    const { model } = await load(modelId, ctx);
    const t0 = performance.now();
    const base = { model: model as never, maxRetries: 0, providerOptions: NO_THINK };
    const out =
      kind === "plain"
        ? await generateText({ ...base, prompt: "Say hello in five words." })
        : kind === "tool"
          ? await generateText({
              ...base,
              prompt: "What is the weather in Paris? Use the tool.",
              tools: { getWeather: tool({ description: "Get weather for a city", inputSchema: z.object({ city: z.string() }), execute: async ({ city }) => ({ city, temp: 18 }) }) },
              stopWhen: stepCountIs(3),
            })
          : await generateText({ ...base, system: buildSystemPrompt(), prompt: "Say hello." });
    return {
      ms: Math.round(performance.now() - t0),
      text: out.text.slice(0, 300),
      toolCalls: out.steps.flatMap((s) => s.toolCalls.map((c) => ({ name: c.toolName, input: c.input }))),
      usage: out.usage,
    };
  },

  /** real system prompt + a subset of the real tools, 1 output token */
  async probe(modelId: string, toolNames: string[], ctx?: number, maxTokens = 16) {
    const { model } = await load(modelId, ctx);
    const t0 = performance.now();
    const subset = Object.fromEntries(Object.entries(tools).filter(([k]) => toolNames.includes(k)));
    const out = await generateText({
      model: model as never,
      maxRetries: 0,
      providerOptions: NO_THINK,
      system: buildSystemPrompt(),
      prompt: "Say hello.",
      tools: subset as never,
      maxOutputTokens: maxTokens,
    });
    return { ms: Math.round(performance.now() - t0), tools: toolNames.length, inputTokens: out.usage.inputTokens };
  },

  /** full agent loop on one benchmark prompt, using the real tools */
  async agent(modelId: string, promptId: string, ctx?: number, maxSteps = 8) {
    const { model } = await load(modelId, ctx);
    const prompt = benchPrompts.find((p) => p.id === promptId);
    if (!prompt) throw new Error(`unknown prompt ${promptId}`);
    return runOne(model, prompt, maxSteps);
  },
};

(window as any).wl = wl;
document.getElementById("log")!.textContent += "\nready";
