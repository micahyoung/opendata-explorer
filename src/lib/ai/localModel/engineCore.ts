import {
  AutoProcessor,
  InterruptableStoppingCriteria,
  Qwen3_5ForConditionalGeneration,
  Tensor,
  type ProgressInfo,
} from "@huggingface/transformers";
import { MODEL_DTYPE, MODEL_ID } from "../../../config/localModel";
import { IM_END, planPrompt, type Generation } from "./renderPrompt";
import type { GenerateRequest, GenerateResult, LocalEngine } from "./types";

type Tokenizer = {
  (text: string, options?: object): { input_ids: Tensor };
  decode(ids: number[], options?: object): string;
  convert_tokens_to_ids(token: string): number;
};

interface KvCache {
  get_seq_length(): number;
  dispose(): Promise<void>;
}

interface Generator {
  generate(options: object): Promise<unknown>;
  prepare_inputs_for_generation: (...args: unknown[]) => Record<string, unknown>;
}

/**
 * Transformers.js 4.3.1: with an external KV cache, Qwen VL-type models set `pixel_values = null`, `pick()` keeps the null, and a
 * multi-token continuation runs the vision encoder on nothing ("Missing the following inputs: pixel_values"). Dropping the key
 * lets the text-only continuation through. Re-check when upgrading @huggingface/transformers.
 */
function patchNullPixelValues(model: Generator) {
  const original = model.prepare_inputs_for_generation.bind(model);
  model.prepare_inputs_for_generation = (...args) => {
    const inputs = original(...args);
    if (inputs.pixel_values === null) delete inputs.pixel_values;
    return inputs;
  };
}

const int64 = (ids: number[]) => new Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]);
const ones = (n: number) => new Tensor("int64", new BigInt64Array(n).fill(1n), [1, n]);

export interface Engine extends LocalEngine {
  /** Forget the conversation and free its KV cache. */
  reset(): Promise<void>;
}

/**
 * Loads Qwen3.5 and returns an engine whose chat history is a growing token sequence with a live KV cache: each step prefills
 * only the tokens added since the previous step (tool results plus the generation header). Anything that stops the cache from
 * being extended exactly (a new conversation, an edited history, an aborted or failed step) falls back to a full prefill.
 */
export async function loadEngine(onProgress: (info: ProgressInfo) => void): Promise<Engine> {
  const processor = await AutoProcessor.from_pretrained(MODEL_ID, { progress_callback: onProgress });
  const model = (await Qwen3_5ForConditionalGeneration.from_pretrained(MODEL_ID, {
    dtype: MODEL_DTYPE as never,
    device: "webgpu",
    progress_callback: onProgress,
  })) as unknown as Generator;
  patchNullPixelValues(model);

  const tokenizer = (processor as unknown as { tokenizer: Tokenizer }).tokenizer;
  const imEndId = tokenizer.convert_tokens_to_ids(IM_END);
  const encode = (text: string) =>
    (tokenizer(text, { add_special_tokens: false }).input_ids.tolist() as bigint[][])[0].map(Number);

  let cached: { cache: KvCache; text: string; ids: number[] } | undefined;
  let gens: Generation[] = [];
  let busy = false;
  let stepNo = 0;

  async function reset() {
    const old = cached;
    cached = undefined;
    gens = [];
    await old?.cache.dispose();
  }

  async function generate(req: GenerateRequest, signal?: AbortSignal): Promise<GenerateResult> {
    if (busy) throw new Error("The model is already generating.");
    busy = true;
    try {
      signal?.throwIfAborted();
      const startedAt = new Date();
      const plan = planPrompt(req.messages, gens, cached?.text, req.thinking);
      if (plan.cold) await reset();
      if (plan.cold === "new conversation") stepNo = 0;
      const warm = cached !== undefined;
      const reusedTokens = warm ? cached!.ids.length : 0;
      const fedText = warm ? plan.text.slice(cached!.text.length) : plan.text;
      const inputIds = warm ? [...cached!.ids, ...encode(fedText)] : encode(plan.text);

      const stopping = new InterruptableStoppingCriteria();
      const onAbort = () => stopping.interrupt();
      signal?.addEventListener("abort", onAbort);
      let sequence: number[];
      let cache: KvCache;
      try {
        const out = (await model.generate({
          input_ids: int64(inputIds),
          attention_mask: ones(inputIds.length),
          ...(warm ? { past_key_values: cached!.cache } : {}),
          max_new_tokens: req.maxTokens,
          do_sample: false,
          return_dict_in_generate: true,
          stopping_criteria: stopping,
        })) as { sequences: Tensor; past_key_values: KvCache };
        sequence = (out.sequences.tolist() as bigint[][])[0].map(Number);
        cache = out.past_key_values;
      } catch (e) {
        await reset(); // a failed run may leave the cache half-updated
        throw e;
      } finally {
        signal?.removeEventListener("abort", onAbort);
      }

      if (signal?.aborted) {
        await cache.dispose();
        await reset();
        signal.throwIfAborted();
      }

      const generated = sequence.slice(inputIds.length);
      const raw = tokenizer.decode(generated, { skip_special_tokens: false });
      const header = plan.text.slice(plan.text.lastIndexOf("<|im_start|>assistant"));
      cached = { cache, text: plan.text + raw, ids: sequence };
      gens.push({ header, raw });
      const finish = generated.at(-1) === imEndId ? "stop" : "length";
      return {
        trace: {
          step: ++stepNo,
          startedAt: startedAt.toISOString(),
          ms: Date.now() - startedAt.getTime(),
          ...(plan.cold ? { coldReason: plan.cold } : {}),
          thinking: req.thinking,
          maxTokens: req.maxTokens,
          messages: req.messages,
          promptText: plan.text,
          fedText,
          promptTokens: inputIds.length,
          reusedTokens,
          fedTokens: inputIds.length - reusedTokens,
          rawOutput: raw,
          completionTokens: generated.length,
          finish,
        },
        raw: raw.replace(/<\|im_end\|>|<\|endoftext\|>/g, ""),
        promptTokens: inputIds.length,
        completionTokens: generated.length,
        finish,
      };
    } finally {
      busy = false;
    }
  }

  return { generate, reset };
}
