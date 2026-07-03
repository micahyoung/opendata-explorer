import { useMemo } from "react";
import { createOpenAI } from "@ai-sdk/openai";
import { useCredentials } from "../credentials/useCredentials";

/**
 * Memoized on the current credentials object (not a module singleton) so
 * that SettingsPanel edits take effect immediately without a page reload.
 */
export function useOpenAIClient() {
  const credentials = useCredentials((s) => s.credentials);

  return useMemo(() => {
    if (!credentials) return undefined;
    return createOpenAI({ baseURL: credentials.baseURL, apiKey: credentials.apiKey });
  }, [credentials]);
}
