/** The single on-device model the app runs. Weights are fetched from Hugging Face on explicit user request and cached by the browser. */
export const MODEL_ID = "onnx-community/Qwen3.5-2B-ONNX-OPT";

/**
 * Per-component ONNX precision. fp16 is the only configuration validated for tool use so far (q4f16 picked wrong datasets).
 * Changing this changes the download size and the memory the GPU needs.
 */
export const MODEL_DTYPE = {
  embed_tokens: "fp16",
  vision_encoder: "fp16",
  decoder_model_merged: "fp16",
} as const;

/** Approximate bytes downloaded for MODEL_DTYPE (decoder + embeddings + vision encoder), for the UI and the storage check. */
export const MODEL_DOWNLOAD_BYTES = 4.8e9;

/** Upper bound on tokens generated per agent step. Tool calls with long id arrays were truncated at 400. */
export const MAX_OUTPUT_TOKENS = 1024;

/** Longest single tool result (characters) shown to the model; the UI and map still receive the full result. */
export const MAX_TOOL_RESULT_CHARS = 12_000;
