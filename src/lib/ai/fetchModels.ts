import { MODEL_LIST_TIMEOUT_MS } from "../../config/constants";
import { TimeoutError } from "../utils/errors";

/**
 * Metadata beyond `id` is provider-specific. Plain OpenAI's `/v1/models` only ever
 * returns { id, object, created, owned_by } — no capability info. OpenRouter's
 * `/v1/models` additionally returns `architecture.output_modalities` and
 * `supported_parameters`, which is enough to tell text/tool-calling models apart
 * from image/audio/embedding models. Fields are read defensively since most
 * OpenAI-compatible servers (including llama.cpp) omit them entirely.
 */
export interface ModelInfo {
  id: string;
  outputModalities?: string[];
  supportsTools?: boolean;
}

interface RawModel {
  id: string;
  architecture?: { output_modalities?: string[] };
  supported_parameters?: string[];
}

/**
 * Fetches model metadata from an OpenAI-compatible `/models` endpoint.
 * Used to populate the onboarding model dropdown; callers should treat any
 * rejection (CORS, 404, timeout) as "fall back to free text", not fatal.
 */
export async function fetchModels(baseURL: string, apiKey: string): Promise<ModelInfo[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_LIST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseURL.replace(/\/+$/, "")}/models`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TimeoutError(`Model list request timed out after ${MODEL_LIST_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Model list request failed with status ${response.status}`);
  }

  const body = (await response.json()) as { data?: RawModel[] };
  if (!Array.isArray(body.data)) {
    throw new Error("Model list response did not match the expected { data: [...] } shape");
  }
  return body.data.map((m) => ({
    id: m.id,
    outputModalities: m.architecture?.output_modalities,
    supportsTools: m.supported_parameters?.includes("tools"),
  }));
}
