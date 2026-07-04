import { useMemo } from "react";
import { DirectChatTransport, Experimental_Agent as ToolLoopAgent, stepCountIs, wrapLanguageModel } from "ai";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useCredentials } from "../credentials/useCredentials";
import { useOpenAIClient } from "./openaiClient";
import { reasoningEffortMiddleware } from "./reasoningEffortMiddleware";
import { buildSystemPrompt } from "./systemPrompt";
import { tools } from "./tools";

const MAX_AGENT_STEPS = 8;

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
      // `.responses()` targets the /v1/responses endpoint, now supported by
      // OpenAI, OpenRouter, and llama-server, and required for provider
      // reasoning controls (see reasoningEffortMiddleware).
      model: wrapLanguageModel({ model: client.responses(model), middleware: reasoningEffortMiddleware }),
      instructions: buildSystemPrompt(),
      tools,
      stopWhen: stepCountIs(MAX_AGENT_STEPS),
    });

    return new DirectChatTransport({ agent });
  }, [client, model]);

  return useChatRuntime({ transport });
}
