import type { ModelInfo } from "./fetchModels";

/**
 * OpenAI's catalog mixes chat/tool-calling models in with image/audio/embedding/
 * legacy-completion models that plain `/v1/models` gives no way to tell apart
 * (no capability metadata). Rather than guess via id heuristics, hardcode the
 * known-good set directly.
 */
export const OPENAI_MODEL_ALLOWLIST = ["gpt-5-nano", "gpt-5-mini", "gpt-5", "gpt-5-pro"];

/**
 * Whether a model looks usable for text chat + tool calling in this app.
 * For OpenAI, checked against a hardcoded allowlist (see above). For other
 * providers (e.g. OpenRouter), uses whatever capability metadata that
 * provider's `/v1/models` actually exposes; providers exposing none (e.g.
 * local llama.cpp) are left unfiltered.
 */
export function isSuitableModel(model: ModelInfo, presetId: string): boolean {
  if (presetId === "openai") return OPENAI_MODEL_ALLOWLIST.includes(model.id);
  if (model.outputModalities && !model.outputModalities.includes("text")) return false;
  if (model.supportsTools === false) return false;
  return true;
}
