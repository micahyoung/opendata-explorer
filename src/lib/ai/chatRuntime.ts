import { useMemo } from "react";
import { DirectChatTransport, Experimental_Agent as ToolLoopAgent, stepCountIs } from "ai";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useCredentials } from "../credentials/useCredentials";
import { useOpenAIClient } from "./openaiClient";
import { buildSystemPrompt } from "./systemPrompt";
import { tools } from "./tools";

const MAX_AGENT_STEPS = 6;

/**
 * Wires assistant-ui's chat runtime directly to an in-browser agent (no
 * server route) via DirectChatTransport, so the whole request/response/tool
 * loop happens client-side against the user's BYO-LLM endpoint.
 */
export function useOpenDataChatRuntime() {
  const client = useOpenAIClient();
  const model = useCredentials((s) => s.credentials?.model);

  const transport = useMemo(() => {
    if (!client || !model) return undefined;

    const agent = new ToolLoopAgent({
      // `.chat()` targets the universal /v1/chat/completions endpoint rather
      // than OpenAI's proprietary /v1/responses API. BYO-LLM providers like
      // OpenRouter and local llama.cpp/Ollama servers only implement the
      // former, and calling a bare model id defaults to the latter.
      model: client.chat(model),
      instructions: buildSystemPrompt(),
      tools,
      stopWhen: stepCountIs(MAX_AGENT_STEPS),
    });

    return new DirectChatTransport({ agent });
  }, [client, model]);

  return useChatRuntime({ transport });
}
