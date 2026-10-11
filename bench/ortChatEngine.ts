import { AutoProcessor, LogitsProcessor, LogitsProcessorList, Qwen3_5ForConditionalGeneration, Tensor } from "@huggingface/transformers";
import type { ChatEngine } from "./qwenWebLlmModel";

type Msg = { role: string; content: string };
type Tok = {
  (t: string, o?: object): { input_ids: Tensor };
  decode(ids: unknown, o?: object): string;
  convert_tokens_to_ids(t: string): number;
  apply_chat_template(m: object[], o: object): string;
};
interface Cache {
  get_seq_length(): number;
  dispose(): Promise<void>;
}
type Gen = {
  generate(o: object): Promise<unknown>;
  prepare_inputs_for_generation: (...a: unknown[]) => Record<string, unknown>;
  __patched?: boolean;
};

/** What the wrapper (qwenWebLlmModel.ts) sends: the subset of an OpenAI chat-completions request it uses. */
interface Req {
  messages: Msg[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  presence_penalty?: number;
  extra_body?: { enable_thinking?: boolean };
}

export interface OrtCallStat {
  promptTokens: number;
  /** Tokens already in the cache from earlier steps (0 on a cold prefill). */
  reusedTokens: number;
  /** Tokens actually fed to the model this call. */
  fedTokens: number;
  completionTokens: number;
  ms: number;
  /** Why the cache was not used, when it was not. */
  coldReason?: string;
}

/** OpenAI/vLLM-style presence penalty: flat subtraction for tokens already generated (the prompt is excluded). */
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

/** Captures the next-token distribution (full logits copy + log-sum-exp) at the one position generate() is asked to sample. */
class CaptureLogits extends LogitsProcessor {
  data: Float32Array | undefined;
  lse = 0;
  _call(_ids: bigint[][], logits: Tensor) {
    const d = (logits as unknown as Tensor[])[0].data as Float32Array;
    let max = -Infinity;
    for (let i = 0; i < d.length; i++) if (d[i] > max) max = d[i];
    let sum = 0;
    for (let i = 0; i < d.length; i++) sum += Math.exp(d[i] - max);
    this.lse = max + Math.log(sum);
    this.data = Float32Array.from(d);
    return logits;
  }
}

/** Records the top-5 next-token probabilities at every sampling step without changing them. */
class TraceTop extends LogitsProcessor {
  steps: { id: number; p: number }[][] = [];
  _call(_ids: bigint[][], logits: Tensor) {
    const d = (logits as unknown as Tensor[])[0].data as Float32Array;
    let max = -Infinity;
    for (let i = 0; i < d.length; i++) if (d[i] > max) max = d[i];
    let sum = 0;
    for (let i = 0; i < d.length; i++) sum += Math.exp(d[i] - max);
    const lse = max + Math.log(sum);
    const top: number[] = [];
    for (let i = 0; i < d.length; i++) {
      if (top.length < 5 || d[i] > d[top[top.length - 1]]) {
        top.push(i);
        top.sort((a, b) => d[b] - d[a]);
        if (top.length > 5) top.pop();
      }
    }
    this.steps.push(top.map((id) => ({ id, p: Math.exp(d[id] - lse) })));
    return logits;
  }
}

/**
 * Transformers.js 4.3.1 bug: with an external cache, Qwen VL-type models set `pixel_values = null`, which `pick()` keeps, so a
 * multi-token continuation runs the vision encoder on nothing. Dropping the key lets the text-only continuation through.
 */
function patchNullPixelValues(model: Gen) {
  if (model.__patched) return;
  const orig = model.prepare_inputs_for_generation.bind(model);
  model.prepare_inputs_for_generation = (...a) => {
    const r = orig(...a);
    if (r.pixel_values === null) delete r.pixel_values;
    return r;
  };
  model.__patched = true;
}

const IM_END = "<|im_end|>";
const DTYPES = {
  q4f16: { embed_tokens: "q4f16", vision_encoder: "q4f16", decoder_model_merged: "q4f16" },
  // What Hugging Face's own Qwen3.5-WebGPU demo loads.
  q4: { embed_tokens: "q4", vision_encoder: "fp16", decoder_model_merged: "q4" },
  // Unquantized weights, to separate quantization error from graph/runtime error.
  fp16: { embed_tokens: "fp16", vision_encoder: "fp16", decoder_model_merged: "fp16" },
};

const idsOf = (t: Tensor) => (t.tolist() as bigint[][])[0].map(Number);
const tensor2d = (ids: number[]) => new Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]);

/**
 * A ChatEngine over Transformers.js whose chat history is a growing token sequence with a live KV cache.
 *
 * The wrapper re-renders every earlier assistant turn from the parsed result on each step, which would never match the cache
 * byte-for-byte. So the engine keeps the raw text the model actually generated at each step and substitutes it for the
 * wrapper's re-rendering. A step's prompt is then an exact extension of the previous step's tokens, and only the new suffix
 * (tool result + generation header) is prefilled.
 */
export async function createOrtChatEngine({ modelId = "onnx-community/Qwen3.5-2B-ONNX-OPT", reuse = true, dtype = "q4f16" }: { modelId?: string; reuse?: boolean; dtype?: keyof typeof DTYPES } = {}) {
  const t0 = performance.now();
  const processor = await AutoProcessor.from_pretrained(modelId);
  const model = (await Qwen3_5ForConditionalGeneration.from_pretrained(modelId, { dtype: DTYPES[dtype] as never, device: "webgpu" })) as unknown as Gen;
  patchNullPixelValues(model);
  const tok = (processor as unknown as { tokenizer: Tok }).tokenizer;
  const imEndId = tok.convert_tokens_to_ids(IM_END);
  const enc = (text: string) => (tok(text, { add_special_tokens: false }).input_ids.tolist() as bigint[][])[0].map(Number);

  let state: { cache: Cache; text: string; ids: number[] } | undefined;
  let gens: { header: string; raw: string }[] = [];
  const stats: OrtCallStat[] = [];

  async function dropState() {
    await state?.cache.dispose();
    state = undefined;
  }

  const handle = {
    modelId,
    dtype,
    loadMs: Math.round(performance.now() - t0),
    /** Mutable so one loaded model can be compared with reuse on and off. */
    reuse,
    /** When set, create() records the prompt it would send in `lastText` and throws before generating. */
    dryRun: false,
    lastText: "",
    tok,
    countTokens: (text: string) => enc(text).length,
    /** Greedy continuation of raw text (no template, no cache): the tokens as pieces, to see exactly what the model writes. */
    rawGenerate: async (text: string, maxNew = 60) => {
      const ids = enc(text);
      const out = (await model.generate({ input_ids: tensor2d(ids), attention_mask: new Tensor("int64", new BigInt64Array(ids.length).fill(1n), [1, ids.length]), max_new_tokens: maxNew, do_sample: false })) as Tensor;
      const gen = idsOf(out).slice(ids.length);
      return { promptTokens: ids.length, pieces: gen.map((id) => tok.decode([id], { skip_special_tokens: false })) };
    },
    /** Greedy generation that records the top-5 distribution at every step, to compare with a one-shot prefill of the same prefix. */
    traceGenerate: async (text: string, maxNew = 30) => {
      const ids = enc(text);
      const tr = new TraceTop();
      const lp = new LogitsProcessorList();
      lp.push(tr);
      const out = (await model.generate({ input_ids: tensor2d(ids), attention_mask: new Tensor("int64", new BigInt64Array(ids.length).fill(1n), [1, ids.length]), max_new_tokens: maxNew, do_sample: false, logits_processor: lp })) as Tensor;
      const gen = idsOf(out).slice(ids.length);
      return gen.map((id, i) => ({ i, chose: tok.decode([id], { skip_special_tokens: false }), top: (tr.steps[i] ?? []).map((t) => [tok.decode([t.id], { skip_special_tokens: false }), +t.p.toFixed(3)]) }));
    },
    /** Prefill `text` into a cache, then feed `prefix` as a multi-token continuation and report the next-token distribution. */
    chunkDist: async (text: string, prefix: string, k = 5) => {
      const ids = enc(text);
      const full = enc(text + prefix);
      const intact = full.slice(0, ids.length).every((v, i) => v === ids[i]);
      const r1 = (await model.generate({ input_ids: tensor2d(ids), attention_mask: new Tensor("int64", new BigInt64Array(ids.length).fill(1n), [1, ids.length]), max_new_tokens: 1, do_sample: false, return_dict_in_generate: true })) as { past_key_values: Cache };
      const cap = new CaptureLogits();
      const lp = new LogitsProcessorList();
      lp.push(cap);
      await model.generate({ input_ids: tensor2d(full), attention_mask: new Tensor("int64", new BigInt64Array(full.length).fill(1n), [1, full.length]), past_key_values: r1.past_key_values, max_new_tokens: 1, do_sample: false, logits_processor: lp });
      await r1.past_key_values.dispose();
      const d = cap.data!;
      const top: number[] = [];
      for (let i = 0; i < d.length; i++) {
        if (top.length < k || d[i] > d[top[top.length - 1]]) {
          top.push(i);
          top.sort((a, b) => d[b] - d[a]);
          if (top.length > k) top.pop();
        }
      }
      return { prefixIntact: intact, fedAsChunk: full.length - ids.length, top: top.map((id) => ({ token: tok.decode([id], { skip_special_tokens: false }), p: +Math.exp(d[id] - cap.lse).toFixed(4) })) };
    },
    /** Top-k next-token log-probabilities after raw `text`, plus the log-probability of the first token of each candidate continuation. */
    nextTokenDist: async (text: string, k = 10, candidates: string[] = []) => {
      const ids = enc(text);
      const cap = new CaptureLogits();
      const lp = new LogitsProcessorList();
      lp.push(cap);
      await model.generate({ input_ids: tensor2d(ids), attention_mask: new Tensor("int64", new BigInt64Array(ids.length).fill(1n), [1, ids.length]), max_new_tokens: 1, do_sample: false, logits_processor: lp });
      const d = cap.data!;
      const top: number[] = [];
      for (let i = 0; i < d.length; i++) {
        if (top.length < k || d[i] > d[top[top.length - 1]]) {
          top.push(i);
          top.sort((a, b) => d[b] - d[a]);
          if (top.length > k) top.pop();
        }
      }
      const fmt = (id: number) => ({ token: tok.decode([id], { skip_special_tokens: false }), id, logprob: +(d[id] - cap.lse).toFixed(3), p: +Math.exp(d[id] - cap.lse).toFixed(4) });
      const scored = candidates.map((c) => {
        const full = enc(text + c);
        const intact = full.slice(0, ids.length).every((v, i) => v === ids[i]);
        return { candidate: c, prefixIntact: intact, ...fmt(full[ids.length]) };
      });
      return { promptTokens: ids.length, top: top.map(fmt), scored };
    },
    stats,
    reset: async () => {
      await dropState();
      gens = [];
    },
    engine: {
      chat: {
        completions: {
          async create(req: Req) {
            const start = performance.now();
            const thinking = req.extra_body?.enable_thinking === true;
            const header = `<|im_start|>assistant\n${thinking ? "<think>\n" : "<think>\n\n</think>\n\n"}`;
            const nAsst = req.messages.filter((m) => m.role === "assistant").length;

            let coldReason: string | undefined;
            if (!handle.reuse) coldReason = "reuse disabled";
            else if (nAsst === 0) coldReason = "new conversation";
            else if (nAsst !== gens.length) coldReason = "assistant turn count mismatch";
            if (coldReason) {
              await dropState();
              gens = [];
            }

            let j = 0;
            const text =
              req.messages
                .map((m) => {
                  if (m.role !== "assistant") return `<|im_start|>${m.role}\n${m.content}${IM_END}\n`;
                  const g = gens[j++];
                  if (g) return g.header + g.raw + (g.raw.endsWith(IM_END) ? "\n" : `${IM_END}\n`);
                  return `${header}${m.content}${IM_END}\n`;
                })
                .join("") + header;

            if (handle.dryRun) {
              handle.lastText = text;
              throw new Error("dryRun");
            }

            if (!coldReason && !(state && text.startsWith(state.text))) {
              coldReason = "prefix mismatch";
              await dropState();
            }

            const warm = state !== undefined && !coldReason;
            const inputIds = warm ? [...state!.ids, ...enc(text.slice(state!.text.length))] : enc(text);
            const reusedTokens = warm ? state!.cache.get_seq_length() : 0;
            const temperature = req.temperature ?? 0;

            let seq: number[];
            let cache: Cache | undefined;
            try {
              const out = (await model.generate({
                input_ids: tensor2d(inputIds),
                attention_mask: new Tensor("int64", new BigInt64Array(inputIds.length).fill(1n), [1, inputIds.length]),
                ...(warm ? { past_key_values: state!.cache } : {}),
                max_new_tokens: req.max_tokens ?? 256,
                do_sample: temperature > 0,
                ...(temperature > 0 ? { temperature, ...(req.top_p !== undefined ? { top_p: req.top_p } : {}) } : {}),
                ...(req.presence_penalty ? { logits_processor: presenceList(inputIds.length, req.presence_penalty) } : {}),
                ...(handle.reuse ? { return_dict_in_generate: true } : {}),
              })) as Tensor | { sequences: Tensor; past_key_values: Cache };
              if (handle.reuse) {
                const r = out as { sequences: Tensor; past_key_values: Cache };
                seq = idsOf(r.sequences);
                cache = r.past_key_values;
              } else {
                seq = idsOf(out as Tensor);
              }
            } catch (e) {
              await dropState(); // a failed run may leave the cache half-updated
              gens = [];
              throw e;
            }

            const gen = seq.slice(inputIds.length);
            const raw = tok.decode(gen, { skip_special_tokens: false });
            if (handle.reuse && cache) {
              state = { cache, text: text + raw, ids: seq };
              gens.push({ header, raw });
            }
            stats.push({
              promptTokens: inputIds.length,
              reusedTokens,
              fedTokens: inputIds.length - reusedTokens,
              completionTokens: gen.length,
              ms: Math.round(performance.now() - start),
              ...(coldReason ? { coldReason } : {}),
            });
            return {
              choices: [{ message: { content: raw.replace(/<\|im_end\|>|<\|endoftext\|>/g, "") }, finish_reason: gen.at(-1) === imEndId ? "stop" : "length" }],
              usage: { prompt_tokens: inputIds.length, completion_tokens: gen.length },
            };
          },
        },
      },
    } satisfies ChatEngine,
  };

  function presenceList(promptLen: number, penalty: number) {
    const l = new LogitsProcessorList();
    l.push(new PresencePenalty(promptLen, penalty));
    return l;
  }

  return handle;
}
