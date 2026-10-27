export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  messages: ChatMessage[];
  maxTokens: number;
  thinking: boolean;
  /** Make a tool call impossible this step (the model can only answer in text). The prompt, and so the KV cache, is unchanged. */
  forbidToolCalls?: boolean;
}

/** One engine step as the model saw it, for the downloadable session log. */
export interface StepTrace {
  /** 1-based within the conversation. */
  step: number;
  startedAt: string;
  ms: number;
  /** Of `ms`: time to the first generated token (the prefill of `fedTokens`), and the rest (decoding `completionTokens`). Excludes tokenizing and cache setup. */
  prefillMs: number;
  decodeMs: number;
  /** Why the KV cache was discarded and the whole prompt re-prefilled; absent when the cache was extended. */
  coldReason?: string;
  /** Tokens in the full prompt after prefill. */
  promptTokens: number;
  /** Tokens served from the KV cache; the rest (`fedTokens`) were prefilled this step. */
  reusedTokens: number;
  fedTokens: number;
  /** Decoded generation with special tokens, before they are stripped. */
  rawOutput: string;
  completionTokens: number;
  finish: "stop" | "length";
}

/** What an aborted step had done when it stopped, so a cut-off generation can still be diagnosed. */
export interface StepProgress {
  /** "decode" once the first token exists; an abort during prefill only lands after that token, so this is rarely "prefill". */
  phase: "prefill" | "decode";
  elapsedMs: number;
  /** Time to the first generated token (the whole elapsed time if there was none). */
  prefillMs: number;
  tokens: number;
  /** Decoded text so far, special tokens kept. */
  partial: string;
}

/** The rejection for an aborted step: an `AbortError` (what callers already recognise), carrying `progress` when the engine had it. */
export function abortedWith(progress?: StepProgress): DOMException {
  const error = new DOMException("Aborted", "AbortError");
  return progress ? Object.assign(error, { progress }) : error;
}

export function progressOf(error: unknown): StepProgress | undefined {
  return typeof error === "object" && error !== null && "progress" in error ? (error as { progress: StepProgress }).progress : undefined;
}

export interface GenerateResult {
  /** Exactly what the model produced, special tokens included. */
  raw: string;
  promptTokens: number;
  completionTokens: number;
  finish: "stop" | "length";
  trace?: StepTrace;
}

/** What the language model needs from the inference engine, wherever it runs. */
export interface LocalEngine {
  generate(req: GenerateRequest, signal?: AbortSignal): Promise<GenerateResult>;
}
