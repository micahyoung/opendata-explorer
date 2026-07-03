export interface ProviderPreset {
  id: string;
  label: string;
  baseURL: string;
  defaultModel: string;
  notes: string;
}

export const providerPresets: ProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    notes: "Requires an OpenAI API key with tool-calling access.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o",
    notes: "Pick a model that supports tool calling — not all OpenRouter models do.",
  },
  {
    id: "local",
    label: "Local (llama.cpp / Ollama)",
    baseURL: "http://localhost:8080/v1",
    defaultModel: "local-model",
    notes:
      "Must be started with CORS enabled for this origin (e.g. llama-server --cors \"*\") and must support OpenAI-style tool calling.",
  },
  {
    id: "custom",
    label: "Custom",
    baseURL: "",
    defaultModel: "",
    notes: "Any OpenAI-compatible, tool-calling endpoint reachable via direct browser CORS.",
  },
];
