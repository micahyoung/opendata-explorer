export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  messages: ChatMessage[];
  maxTokens: number;
  thinking: boolean;
}

/** One engine step as the model saw it, for the downloadable session log. */
export interface StepTrace {
  /** 1-based within the conversation. */
  step: number;
  startedAt: string;
  ms: number;
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
