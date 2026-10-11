import { CreateWebWorkerMLCEngine, prebuiltAppConfig } from "@mlc-ai/web-llm";

const MODEL = "Qwen3.5-2B-q4f16_1-MLC";

/** One tiny request; reports prompt token count and the shape of the first output tokens. */
async function check(thinkTemplate: boolean, enableThinking: boolean | "omit") {
  const appConfig = {
    ...prebuiltAppConfig,
    model_list: prebuiltAppConfig.model_list.map((m) =>
      m.model_id === MODEL ? { ...m, overrides: { ...m.overrides, context_window_size: 4096 } } : m,
    ),
  };
  const engine = await CreateWebWorkerMLCEngine(
    new Worker(new URL("./webllm-worker.ts", import.meta.url), { type: "module" }),
    MODEL,
    { appConfig },
    thinkTemplate ? { conv_config: { role_empty_sep: "\n<think>\n" } } : undefined,
  );
  const res = (await engine.chat.completions.create({
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "What is 17 times 3?" },
    ],
    max_tokens: 60,
    temperature: 0,
    stream: false,
    ...(enableThinking === "omit" ? {} : { extra_body: { enable_thinking: enableThinking } }),
  } as never)) as { choices: { message: { content?: string | null } }[]; usage?: { prompt_tokens: number; completion_tokens: number } };
  const text = res.choices[0]?.message.content ?? "";
  return {
    thinkTemplate,
    enableThinking,
    promptTokens: res.usage?.prompt_tokens,
    completionTokens: res.usage?.completion_tokens,
    startsWithThinkTag: text.trimStart().startsWith("<think>"),
    hasCloseThink: text.includes("</think>"),
    firstChars: text.slice(0, 80).replace(/\n/g, "\\n"),
  };
}

(window as unknown as { tc: { check: typeof check } }).tc = { check };
document.getElementById("log")!.textContent += "\nready";
