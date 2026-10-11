import { CreateWebWorkerMLCEngine, prebuiltAppConfig, type WebWorkerMLCEngine } from "@mlc-ai/web-llm";
import { getDataset } from "../src/config/datasets";
import { benchPrompts } from "./prompts";
import { createQwenWebLlmModel } from "./qwenWebLlmModel";
import { runOne } from "./run-one";

let current: { key: string; engine: WebWorkerMLCEngine } | undefined;

async function load(modelId: string, ctx: number, thinkTemplate = false) {
  const key = `${modelId}|${ctx}|${thinkTemplate}`;
  if (current?.key === key) return current.engine;
  const appConfig = {
    ...prebuiltAppConfig,
    model_list: prebuiltAppConfig.model_list.map((m) =>
      m.model_id === modelId ? { ...m, overrides: { ...m.overrides, context_window_size: ctx } } : m,
    ),
  };
  const engine = await CreateWebWorkerMLCEngine(
    new Worker(new URL("./webllm-worker.ts", import.meta.url), { type: "module" }),
    modelId,
    { appConfig },
    // Open <think> in the assistant header (what mlc-llm's qwen3_5 template does), since the prebuilt qwen2 template can't.
    thinkTemplate ? { conv_config: { role_empty_sep: "\n<think>\n" } } : undefined,
  );
  current = { key, engine };
  return engine;
}

/** Full agent loop (real tools, real system prompt, real ToolLoopAgent) on one benchmark prompt. */
const ag = {
  prompts: benchPrompts.map((p) => p.id),
  sfDomain: () => (getDataset("tkzw-k3nq") as { domain?: string } | undefined)?.domain,

  async run(
    modelId: string,
    promptId: string,
    ctx = 8192,
    maxSteps = 8,
    maxTokens = 400,
    thinking = false,
    sampling: { temperature?: number; top_p?: number; presence_penalty?: number; seed?: number } = {},
    thinkTemplate = false,
    maxToolResultChars = Infinity,
    spacedToolJson = false,
  ) {
    const prompt = benchPrompts.find((p) => p.id === promptId);
    if (!prompt) throw new Error(`unknown prompt ${promptId}`);
    const engine = await load(modelId, ctx, thinkTemplate);
    const stats: unknown[] = [];
    const model = createQwenWebLlmModel({ engine: engine as never, modelId, maxTokens, thinking, sampling, omitEnableThinking: thinkTemplate, maxToolResultChars, spacedToolJson, onStats: (s) => stats.push(s) });
    return { ...(await runOne(model, prompt, maxSteps)), stats };
  },
};

(window as unknown as { ag: typeof ag }).ag = ag;
document.getElementById("log")!.textContent += "\nready";
