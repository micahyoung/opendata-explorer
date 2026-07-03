import { MODEL_LIST_TIMEOUT_MS } from "../../config/constants";
import { TimeoutError } from "../utils/errors";

/**
 * Fetches the list of model ids from an OpenAI-compatible `/models` endpoint.
 * Used to populate the onboarding model dropdown; callers should treat any
 * rejection (CORS, 404, timeout) as "fall back to free text", not fatal.
 */
export async function fetchModels(baseURL: string, apiKey: string): Promise<string[]> {
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

  const body = (await response.json()) as { data?: { id: string }[] };
  if (!Array.isArray(body.data)) {
    throw new Error("Model list response did not match the expected { data: [...] } shape");
  }
  return body.data.map((m) => m.id);
}
