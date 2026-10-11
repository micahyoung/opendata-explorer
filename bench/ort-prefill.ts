import { AutoProcessor, LogitsProcessor, LogitsProcessorList, Qwen3_5ForConditionalGeneration, Tensor, env } from "@huggingface/transformers";

type Processor = Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
type Model = Awaited<ReturnType<typeof Qwen3_5ForConditionalGeneration.from_pretrained>>;

/** One model per page load: a failed WebGPU run can poison the device, so reload the page to switch. */
let loaded: { modelId: string; dtype: string; processor: Processor; model: Model } | undefined;

const DTYPES: Record<string, Record<string, string>> = {
  q4: { embed_tokens: "q4", vision_encoder: "fp16", decoder_model_merged: "q4" },
  q4f16: { embed_tokens: "q4f16", vision_encoder: "q4f16", decoder_model_merged: "q4f16" },
};

/** What the adapter will let us allocate; the logits tensor (n x vocab) has to fit in these. */
async function gpuLimits() {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<{ limits: Record<string, number>; features: Set<string> } | null> } }).gpu;
  const adapter = await gpu?.requestAdapter();
  if (!adapter) return { available: false };
  const l = adapter.limits;
  return {
    available: true,
    maxBufferSizeGB: +(l.maxBufferSize / 2 ** 30).toFixed(2),
    maxStorageBufferBindingSizeGB: +(l.maxStorageBufferBindingSize / 2 ** 30).toFixed(2),
    shaderF16: adapter.features.has("shader-f16"),
  };
}

async function load(modelId = "onnx-community/Qwen3.5-2B-ONNX-OPT", dtype = "q4f16") {
  if (loaded) {
    if (loaded.modelId !== modelId || loaded.dtype !== dtype) throw new Error(`already loaded ${loaded.modelId} (${loaded.dtype}); reload the page`);
    return { cached: true };
  }
  const t0 = performance.now();
  const processor = await AutoProcessor.from_pretrained(modelId);
  const model = await Qwen3_5ForConditionalGeneration.from_pretrained(modelId, { dtype: DTYPES[dtype] as never, device: "webgpu" });
  loaded = { modelId, dtype, processor, model };
  const inputs = (model as unknown as { sessions?: Record<string, { inputNames?: string[] }> }).sessions?.decoder_model_merged?.inputNames;
  return { loadMs: Math.round(performance.now() - t0), takesNumLogitsToKeep: inputs?.includes("num_logits_to_keep") };
}

const FILLER = "The quick brown fox jumps over the lazy dog while the dataset columns list rows of civic open data records. ";

/** One prefill of n prompt tokens plus one generated token. Reports timing or the error. */
async function prefill(n: number) {
  if (!loaded) throw new Error("load first");
  const tok = (loaded.processor as unknown as { tokenizer: (t: string, o?: object) => { input_ids: { data: BigInt64Array } } }).tokenizer;
  const ids = tok(FILLER.repeat(Math.ceil(n / 20) + 8), { add_special_tokens: false }).input_ids.data.slice(0, n);
  const input_ids = new Tensor("int64", ids, [1, ids.length]);
  const attention_mask = new Tensor("int64", new BigInt64Array(ids.length).fill(1n), [1, ids.length]);
  const t0 = performance.now();
  try {
    const out = (await (loaded.model as unknown as { generate(o: object): Promise<{ dims: number[] }> }).generate({ input_ids, attention_mask, max_new_tokens: 1, do_sample: false })) as { dims: number[] };
    return { n: ids.length, ok: true, ms: Math.round(performance.now() - t0), outDims: out.dims };
  } catch (e) {
    return { n: ids.length, ok: false, ms: Math.round(performance.now() - t0), error: String((e as Error)?.message ?? e).slice(0, 300) };
  }
}

type Msg = { role: string; content: string };
type Tok = {
  apply_chat_template(m: Msg[], o: object): string;
  (t: string, o?: object): { input_ids: Tensor; attention_mask: Tensor };
  decode(ids: unknown, o?: object): string;
};

/** Real chat template, greedy decode. Returns the rendered prompt's tail and the generated text, to check the output is sane. */
async function complete(messages: Msg[], maxNewTokens = 64, tools?: object[]) {
  if (!loaded) throw new Error("load first");
  const tok = (loaded.processor as unknown as { tokenizer: Tok }).tokenizer;
  const prompt = tok.apply_chat_template(messages, { add_generation_prompt: true, tokenize: false, ...(tools ? { tools } : {}) });
  const enc = tok(prompt, { add_special_tokens: false });
  const nPrompt = enc.input_ids.dims[1];
  const t0 = performance.now();
  try {
    const out = (await (loaded.model as unknown as { generate(o: object): Promise<Tensor> }).generate({ ...enc, max_new_tokens: maxNewTokens, do_sample: false })) as Tensor;
    const newIds = (out.tolist() as bigint[][])[0].slice(nPrompt);
    return {
      ok: true,
      ms: Math.round(performance.now() - t0),
      promptTokens: nPrompt,
      newTokens: newIds.length,
      promptTail: prompt.slice(-120),
      text: tok.decode(newIds, { skip_special_tokens: false }),
    };
  } catch (e) {
    return { ok: false, ms: Math.round(performance.now() - t0), error: String((e as Error)?.message ?? e).slice(0, 300) };
  }
}


/** OpenAI/vLLM-style presence penalty (flat subtraction for any token already generated; the prompt is excluded). Transformers.js has no built-in. */
class PresencePenalty extends LogitsProcessor {
  constructor(private promptLen: number, private penalty: number) {
    super();
  }
  _call(input_ids: bigint[][], logits: Tensor) {
    for (let i = 0; i < input_ids.length; i++) {
      const data = (logits as unknown as Tensor[])[i].data as Float32Array;
      for (const id of new Set(input_ids[i].slice(this.promptLen))) data[Number(id)] -= this.penalty;
    }
    return logits;
  }
}

type Gen = { generate(o: object): Promise<unknown> };
const idsOf = (t: Tensor) => (t.tolist() as bigint[][])[0].map(Number);

/** Sampling with the model card's params. Unsupported ones are reported rather than silently dropped. */
async function sampled(messages: Msg[], params: { temperature?: number; top_p?: number; top_k?: number; min_p?: number; presence_penalty?: number; repetition_penalty?: number }, maxNewTokens = 60) {
  if (!loaded) throw new Error("load first");
  const tok = (loaded.processor as unknown as { tokenizer: Tok }).tokenizer;
  const enc = tok(tok.apply_chat_template(messages, { add_generation_prompt: true, tokenize: false }), { add_special_tokens: false });
  const nPrompt = enc.input_ids.dims[1];
  const { presence_penalty, min_p, ...native } = params;
  const lp = new LogitsProcessorList();
  if (presence_penalty) lp.push(new PresencePenalty(nPrompt, presence_penalty));
  const t0 = performance.now();
  try {
    const out = (await (loaded.model as unknown as Gen).generate({ ...enc, ...native, do_sample: (params.temperature ?? 0) > 0, max_new_tokens: maxNewTokens, ...(presence_penalty ? { logits_processor: lp } : {}) })) as Tensor;
    const gen = idsOf(out).slice(nPrompt);
    return { ok: true, ms: Math.round(performance.now() - t0), newTokens: gen.length, ignored: min_p ? ["min_p (unsupported; 0.0 is a no-op)"] : [], text: tok.decode(gen, { skip_special_tokens: true }) };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e).slice(0, 300) };
  }
}

/**
 * Workaround for a Transformers.js 4.3.1 bug: with an external cache, Qwen VL-type models set `pixel_values = null`, which
 * `pick()` keeps (it only drops `undefined`), so a multi-token continuation runs the vision encoder on nothing and throws
 * "Missing the following inputs: pixel_values, image_grid_thw". Dropping the key makes the text-only continuation work.
 */
function patchNullPixelValues(model: unknown) {
  const m = model as { prepare_inputs_for_generation: (...a: unknown[]) => Record<string, unknown>; __patched?: boolean };
  if (m.__patched) return;
  const orig = m.prepare_inputs_for_generation.bind(m);
  m.prepare_inputs_for_generation = (...a) => {
    const r = orig(...a);
    if (r.pixel_values === null) delete r.pixel_values;
    return r;
  };
  m.__patched = true;
}

/**
 * Multi-turn KV reuse. Turn 1 keeps its cache; turn 2 then runs three ways on a large shared prefix:
 *  B = cache + only the new tokens (the reuse path)
 *  C = no cache, the exact same token ids as B (checks the cache is numerically transparent)
 *  A = no cache, history re-rendered by the chat template (what an agent loop does today; may differ by a few tokens)
 */
async function kvTest(prefixTokens = 3000, maxNewTokens = 24) {
  if (!loaded) throw new Error("load first");
  const step = (s: string) => ((window as unknown as { __kvStep?: string }).__kvStep = s);
  const tok = (loaded.processor as unknown as { tokenizer: Tok }).tokenizer;
  const model = loaded.model as unknown as Gen;
  patchNullPixelValues(loaded.model);
  const filler = FILLER.repeat(Math.ceil(prefixTokens / 20) + 4);
  const sys = { role: "system", content: `Reference notes:\n${filler}` };
  const user1 = { role: "user", content: "In one short sentence, what animal jumps in the notes?" };
  const user2 = { role: "user", content: "And what does the dog do? One short sentence." };
  const enc = (text: string) => tok(text, { add_special_tokens: false });
  const mask = (n: number) => new Tensor("int64", new BigInt64Array(n).fill(1n), [1, n]);
  const idsT = (ids: number[]) => new Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]);

  const p1 = enc(tok.apply_chat_template([sys, user1], { add_generation_prompt: true, tokenize: false }));
  const n1 = p1.input_ids.dims[1];
  step("turn1");
  let t0 = performance.now();
  const r1 = (await model.generate({ ...p1, max_new_tokens: maxNewTokens, do_sample: false, return_dict_in_generate: true })) as { sequences: Tensor; past_key_values: { get_seq_length(): number } };
  const turn1Ms = Math.round(performance.now() - t0);
  const seq1 = idsOf(r1.sequences);
  const text1 = tok.decode(seq1.slice(n1), { skip_special_tokens: true });
  const cachedLen = r1.past_key_values.get_seq_length();

  // Delta: close the assistant turn exactly as generated, then the new user turn and generation prompt.
  const tail = tok.apply_chat_template([{ role: "user", content: "x" }, { role: "assistant", content: "y" }, user2], { add_generation_prompt: true, tokenize: false });
  const afterAsst = tail.slice(tail.indexOf("y") + 1); // "<|im_end|>\n<|im_start|>user\n...<|im_start|>assistant\n<think>\n\n</think>\n\n"
  const endsWithEnd = seq1.at(-1) === (tok as unknown as { convert_tokens_to_ids(t: string): number }).convert_tokens_to_ids("<|im_end|>");
  const deltaText = endsWithEnd ? afterAsst.replace(/^<\|im_end\|>/, "") : afterAsst;
  const fullIds = [...seq1, ...(enc(deltaText).input_ids.tolist() as bigint[][])[0].map(Number)];

  step("B cached");
  t0 = performance.now();
  const rb = (await model.generate({ input_ids: idsT(fullIds), attention_mask: mask(fullIds.length), past_key_values: r1.past_key_values, max_new_tokens: maxNewTokens, do_sample: false })) as Tensor;
  const B = { ms: Math.round(performance.now() - t0), ids: idsOf(rb).slice(fullIds.length) };

  step("C same ids no cache");
  t0 = performance.now();
  const rc = (await model.generate({ input_ids: idsT(fullIds), attention_mask: mask(fullIds.length), max_new_tokens: maxNewTokens, do_sample: false })) as Tensor;
  const C = { ms: Math.round(performance.now() - t0), ids: idsOf(rc).slice(fullIds.length) };

  step("C2 repeat");
  const rc2 = (await model.generate({ input_ids: idsT(fullIds), attention_mask: mask(fullIds.length), max_new_tokens: maxNewTokens, do_sample: false })) as Tensor;
  const C2ids = idsOf(rc2).slice(fullIds.length);

  const pa = enc(tok.apply_chat_template([sys, user1, { role: "assistant", content: text1 }, user2], { add_generation_prompt: true, tokenize: false }));
  step("A re-rendered");
  t0 = performance.now();
  const ra = (await model.generate({ ...pa, max_new_tokens: maxNewTokens, do_sample: false })) as Tensor;
  const A = { ms: Math.round(performance.now() - t0), ids: idsOf(ra).slice(pa.input_ids.dims[1]), promptTokens: pa.input_ids.dims[1] };

  const same = (x: number[], y: number[]) => x.length === y.length && x.every((v, i) => v === y[i]);
  return {
    turn1: { promptTokens: n1, ms: turn1Ms, cachedLen, text: text1, endedWithImEnd: endsWithEnd },
    turn2: { fullTokens: fullIds.length, deltaTokens: fullIds.length - cachedLen },
    B_cached: { ms: B.ms, text: tok.decode(B.ids, { skip_special_tokens: true }) },
    C_samIdsNoCache: { ms: C.ms, text: tok.decode(C.ids, { skip_special_tokens: true }) },
    A_reRendered: { ms: A.ms, promptTokens: A.promptTokens, text: tok.decode(A.ids, { skip_special_tokens: true }) },
    C_equals_C2_deterministic: same(C.ids, C2ids),
    B_equals_C: same(B.ids, C.ids),
    firstDivergenceBvsC: B.ids.findIndex((v, i) => v !== C.ids[i]),
    B_equals_A: same(B.ids, A.ids),
  };
}

/** Prefill at each size in turn, stopping at the first failure (the device may be unusable after one). */
async function sweep(sizes: number[]) {
  const results: Awaited<ReturnType<typeof prefill>>[] = [];
  for (const n of sizes) {
    const r = await prefill(n);
    results.push(r);
    if (!r.ok) break;
  }
  return results;
}

const ort = { load, prefill, complete, sampled, kvTest, sweep, gpuLimits, version: () => env.version };
(window as unknown as { ort: typeof ort }).ort = ort;
document.getElementById("log")!.textContent += "\nready";
