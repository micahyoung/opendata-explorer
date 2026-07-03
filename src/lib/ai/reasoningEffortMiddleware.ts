import { APICallError } from "@ai-sdk/provider";
import type { JSONObject, LanguageModelV3CallOptions, LanguageModelV3Middleware } from "@ai-sdk/provider";

/**
 * Defaults to low reasoning effort/verbosity for models that support it.
 * Not every OpenAI-compatible endpoint (OpenRouter, llama-server, non-GPT-5
 * models) tolerates these fields, so a request rejected for them is retried
 * once with the fields stripped rather than failing the whole chat turn.
 */
export const reasoningEffortMiddleware: LanguageModelV3Middleware = {
  specificationVersion: "v3",

  transformParams: async ({ params }) => withReasoningDefaults(params),

  wrapGenerate: async ({ doGenerate, params, model }) => {
    try {
      return await doGenerate();
    } catch (err) {
      if (!isUnsupportedReasoningParamError(err)) throw err;
      return model.doGenerate(withoutReasoningDefaults(params));
    }
  },

  wrapStream: async ({ doStream, params, model }) => {
    try {
      return await doStream();
    } catch (err) {
      if (!isUnsupportedReasoningParamError(err)) throw err;
      return model.doStream(withoutReasoningDefaults(params));
    }
  },
};

function withReasoningDefaults(params: LanguageModelV3CallOptions): LanguageModelV3CallOptions {
  const openaiOptions = params.providerOptions?.openai ?? {};
  return {
    ...params,
    providerOptions: {
      ...params.providerOptions,
      openai: { ...openaiOptions, reasoningEffort: "low", textVerbosity: "low" },
    },
  };
}

function withoutReasoningDefaults(params: LanguageModelV3CallOptions): LanguageModelV3CallOptions {
  const openaiOptions: JSONObject = { ...(params.providerOptions?.openai ?? {}) };
  delete openaiOptions.reasoningEffort;
  delete openaiOptions.textVerbosity;
  return {
    ...params,
    providerOptions: { ...params.providerOptions, openai: openaiOptions },
  };
}

function isUnsupportedReasoningParamError(err: unknown): boolean {
  if (!APICallError.isInstance(err)) return false;
  if (err.statusCode !== 400) return false;
  const haystack = `${err.message} ${err.responseBody ?? ""}`.toLowerCase();
  return haystack.includes("reasoningeffort") || haystack.includes("reasoning_effort") ||
    haystack.includes("textverbosity") || haystack.includes("text_verbosity") ||
    haystack.includes("reasoning.effort") || haystack.includes("text.verbosity");
}
