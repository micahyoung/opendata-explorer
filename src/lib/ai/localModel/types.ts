export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  messages: ChatMessage[];
  maxTokens: number;
  thinking: boolean;
}

export interface GenerateResult {
  /** Exactly what the model produced, special tokens included. */
  raw: string;
  promptTokens: number;
  completionTokens: number;
  finish: "stop" | "length";
}

/** What the language model needs from the inference engine, wherever it runs. */
export interface LocalEngine {
  generate(req: GenerateRequest, signal?: AbortSignal): Promise<GenerateResult>;
}
