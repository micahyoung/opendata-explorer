import { benchPrompts } from "./prompts";
import { createOrtChatEngine } from "./ortChatEngine";
import { createQwenWebLlmModel, pyJson, qwenToolsBlock } from "./qwenWebLlmModel";
import { runOne } from "./run-one";

let eng: Awaited<ReturnType<typeof createOrtChatEngine>> | undefined;

/** Full agent loop (real tools, real system prompt, real ToolLoopAgent) on Transformers.js + Qwen3.5-2B-OPT with a KV cache across steps. */
const oag = {
  prompts: benchPrompts.map((p) => p.id),

  async load(reuse = true, modelId?: string, dtype: "q4" | "q4f16" | "fp16" = "q4f16") {
    if (eng) throw new Error("already loaded; reload the page");
    eng = await createOrtChatEngine({ reuse, dtype, ...(modelId ? { modelId } : {}) });
    return { loadMs: eng.loadMs, reuse: eng.reuse, dtype: eng.dtype };
  },

  setReuse(reuse: boolean) {
    if (!eng) throw new Error("load first");
    eng.reuse = reuse;
    return eng.reset().then(() => ({ reuse }));
  },

  async run(promptId: string, maxSteps = 8, maxTokens = 400, maxToolResultChars = 12000, thinking = false, spacedToolJson = true) {
    if (!eng) throw new Error("load first");
    const prompt = benchPrompts.find((p) => p.id === promptId);
    if (!prompt) throw new Error(`unknown prompt ${promptId}`);
    await eng.reset();
    eng.stats.length = 0;
    const model = createQwenWebLlmModel({ engine: eng.engine, modelId: eng.modelId, maxTokens, thinking, maxToolResultChars, spacedToolJson });
    const t0 = performance.now();
    const result = await runOne(model, prompt, maxSteps);
    return { ...result, totalMs: Math.round(performance.now() - t0), engineStats: eng.stats.slice() };
  },

  /**
   * The exact step-1 prompt the engine would send for a benchmark prompt, against what the model's own chat template renders for
   * the same system prompt, user message and tools. Nothing is generated.
   */
  async dumpStep1(promptId: string) {
    if (!eng) throw new Error("load first");
    const prompt = benchPrompts.find((p) => p.id === promptId);
    if (!prompt) throw new Error(`unknown prompt ${promptId}`);
    await eng.reset();
    eng.dryRun = true;
    let seen: { prompt: Array<{ role: string; content: unknown }>; tools?: Array<{ type: string; name: string; description?: string; inputSchema: unknown }> } | undefined;
    const model = createQwenWebLlmModel({ engine: eng.engine, modelId: eng.modelId, maxTokens: 400, maxToolResultChars: 12000, spacedToolJson: true });
    const origStream = model.doStream.bind(model);
    model.doStream = async (o) => {
      seen = o as never;
      return origStream(o);
    };
    try {
      await runOne(model, prompt, 1);
    } finally {
      eng.dryRun = false;
    }
    if (!seen) throw new Error("model was never called");
    const sys = seen.prompt.find((m) => m.role === "system")?.content as string;
    const userMsg = seen.prompt.find((m) => m.role === "user")?.content as Array<{ type: string; text?: string }>;
    const user = userMsg.map((p) => p.text ?? "").join("");
    const fnTools = (seen.tools ?? []).filter((t) => t.type === "function");
    const official = eng.tok.apply_chat_template(
      [{ role: "system", content: sys }, { role: "user", content: user }],
      { tools: fnTools.map((t) => ({ type: "function", function: { name: t.name, description: t.description ?? "", parameters: t.inputSchema } })), add_generation_prompt: true, tokenize: false },
    );
    const ours = eng.lastText;
    let i = 0;
    while (i < ours.length && i < official.length && ours[i] === official[i]) i++;
    (window as unknown as { __step1: object }).__step1 = { ours, official, sys, user, tools: fnTools, toolNames: fnTools.map((t) => t.name) };
    return {
      identical: ours === official,
      firstDiffAt: ours === official ? -1 : i,
      oursChars: ours.length,
      officialChars: official.length,
      oursTokens: eng.countTokens(ours),
      officialTokens: eng.countTokens(official),
      toolNames: fnTools.map((t) => t.name),
      oursAround: ours.slice(Math.max(0, i - 60), i + 80),
      officialAround: official.slice(Math.max(0, i - 60), i + 80),
    };
  },

  /** Save the exact step-1 text (from dumpStep1) for other pages on this origin, so every stack scores the same string. */
  saveStep1Text() {
    const t = (window as unknown as { __step1?: { ours: string } }).__step1?.ours;
    if (!t) throw new Error("run dumpStep1 first");
    localStorage.setItem("step1text", t);
    return t.length;
  },
  rawGenerate: (text: string, n = 60) => eng!.rawGenerate(text, n),

  /**
   * A short version of a benchmark prompt (a few tools, a few catalog entries, the real preamble and rules) that fits under the
   * parent export's ~4.3k-token one-shot prefill limit. Saved to localStorage("shorttext") so both exports score the same string.
   */
  async buildShortText(promptId: string, toolNames = ["getDatasetDetails", "fetchSocrataData"], keep = "NYC|Chicago|Boston|San Francisco|Seattle") {
    if (!eng) throw new Error("load first");
    await oag.dumpStep1(promptId);
    const st = (window as unknown as { __step1: { sys: string; user: string; tools: { name: string }[] } }).__step1;
    const first = st.sys.indexOf("### ");
    const entries = st.sys.slice(first).split(/\n(?=### )/);
    const last = entries[entries.length - 1];
    const cut = last.indexOf("\n\n");
    const tail = last.slice(cut); // the rules that follow the catalog
    entries[entries.length - 1] = last.slice(0, cut);
    const re = new RegExp(keep, "i");
    const kept = entries.filter((e) => re.test(e.split("\n")[0]));
    const sys2 = `${st.sys.slice(0, first)}${kept.join("\n\n")}${tail}`;
    const tools = st.tools.filter((t) => toolNames.includes(t.name));
    const text = `<|im_start|>system\n${qwenToolsBlock(tools as never, true)}\n\n${sys2}<|im_end|>\n<|im_start|>user\n${st.user}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`;
    localStorage.setItem("shorttext", text);
    return { tokens: eng.countTokens(text), chars: text.length, keptEntries: kept.map((e) => e.split("\n")[0].slice(0, 70)), tools: tools.map((t) => t.name) };
  },

  /** Decode loop vs one-shot prefill at the first dataset-id token of a generation on `text` (found from the traced output). */
  async decodeVsPrefillText(text: string, maxSteps = 26) {
    if (!eng) throw new Error("load first");
    const trace = await eng.traceGenerate(text, maxSteps);
    const idx = trace.findIndex((s) => s.chose.includes('["'));
    const pieces = trace.map((s) => s.chose);
    if (idx < 0 || idx + 1 >= trace.length) return { found: false, pieces };
    const decision = idx + 1;
    const prefix = pieces.slice(0, decision).join("");
    const one = await eng.nextTokenDist(text + prefix, 5);
    return {
      found: true,
      decision,
      promptTokens: eng.countTokens(text),
      tokensAsExpected: one.promptTokens === eng.countTokens(text) + decision,
      prefixTail: prefix.slice(-34),
      decodeLoop: trace[decision].top,
      onePassPrefill: one.top.map((t) => [t.token, t.p]),
    };
  },
  /**
   * The same decision position computed two ways: inside the normal generation loop (token-by-token decode after a prefill), and
   * as a one-shot prefill of the identical token sequence. If the model is consistent the two distributions match.
   */
  async decodeVsPrefill(promptId: string, stepIndex = 17) {
    if (!eng) throw new Error("load first");
    await oag.dumpStep1(promptId);
    const text = (window as unknown as { __step1: { ours: string } }).__step1.ours;
    const trace = await eng.traceGenerate(text, stepIndex + 1);
    const prefix = trace.slice(0, stepIndex).map((s) => s.chose).join("");
    const one = await eng.nextTokenDist(text + prefix, 5);
    return {
      promptId,
      stepIndex,
      prefixTail: prefix.slice(-34),
      tokensAsExpected: one.promptTokens === eng.countTokens(text) + stepIndex,
      decodeLoop: trace[stepIndex].top,
      onePassPrefill: one.top.map((t) => [t.token, t.p]),
    };
  },
  nextTokenDist: (text: string, k = 10, candidates: string[] = []) => eng!.nextTokenDist(text, k, candidates),
  traceGenerate: (text: string, n = 30) => eng!.traceGenerate(text, n),
  chunkDist: (text: string, prefix: string, k = 5) => eng!.chunkDist(text, prefix, k),

  /** Is the hand-built Qwen tools block what the model's own chat template renders? */
  async templateCheck() {
    const { AutoProcessor } = await import("@huggingface/transformers");
    const proc = await AutoProcessor.from_pretrained("onnx-community/Qwen3.5-2B-ONNX-OPT");
    const tok = (proc as unknown as { tokenizer: { apply_chat_template(m: object[], o: object): string } }).tokenizer;
    const tools = [
      { type: "function" as const, name: "alpha", description: "Does alpha things.", inputSchema: { type: "object", properties: { q: { type: "string", description: "query" }, n: { type: "integer", minimum: 1, maximum: 200 } }, required: ["q"] } },
      { type: "function" as const, name: "beta", description: "Does beta things.", inputSchema: { type: "object", properties: { ids: { type: "array", items: { type: "string" } } } } },
    ];
    const ours = `<|im_start|>system\n${qwenToolsBlock(tools as never, true)}\n\nSYS<|im_end|>\n<|im_start|>user\nU<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`;
    const official = tok.apply_chat_template(
      [{ role: "system", content: "SYS" }, { role: "user", content: "U" }],
      { tools: tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } })), add_generation_prompt: true, tokenize: false },
    );
    let i = 0;
    while (i < ours.length && i < official.length && ours[i] === official[i]) i++;
    return { identical: ours === official, firstDiffAt: ours === official ? -1 : i, oursAround: ours.slice(Math.max(0, i - 40), i + 60), officialAround: official.slice(Math.max(0, i - 40), i + 60) };
  },
};

(window as unknown as { oag: typeof oag }).oag = oag;
document.getElementById("log")!.textContent += "\nready";
