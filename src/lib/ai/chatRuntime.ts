import { useMemo } from "react";
import { Experimental_Agent as ToolLoopAgent, stepCountIs, wrapLanguageModel } from "ai";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useCredentials } from "../credentials/useCredentials";
import { useOpenAIClient } from "./openaiClient";
import { PinAwareChatTransport } from "./pinAwareChatTransport";
import { reasoningEffortMiddleware } from "./reasoningEffortMiddleware";
import { buildSystemPrompt } from "./systemPrompt";
import { tools } from "./tools";

const MAX_AGENT_STEPS = 8;

/**
 * Wires assistant-ui's chat runtime directly to an in-browser agent (no
 * server route) via PinAwareChatTransport, so the whole request/response/tool
 * loop happens client-side against the user's BYO-LLM endpoint.
 */
export function useOpenDataChatRuntime() {
  const client = useOpenAIClient();
  const model = useCredentials((s) => s.credentials?.model);

  const transport = useMemo(() => {
    if (!client || !model) return undefined;

    // `.chat()` targets /v1/chat/completions — the interface every BYO-LLM
    // target actually implements reliably (OpenAI, OpenRouter, llama-server/
    // Ollama). `/v1/responses` was tried and reverted after llama-server's
    // non-conformant SSE stream (reasoning event names don't match OpenAI's)
    // broke tool-call recognition under this SDK's strict parser — see
    // ggml-org/llama.cpp#20607. reasoningEffortMiddleware's provider-option
    // keys map onto the same flat reasoning_effort/verbosity body fields
    // here, so no middleware changes are needed.
    const agent = new ToolLoopAgent({
      model: wrapLanguageModel({ model: client.chat(model), middleware: reasoningEffortMiddleware }),
      instructions: buildSystemPrompt(),
      tools,
      stopWhen: stepCountIs(MAX_AGENT_STEPS),
    });

    return new PinAwareChatTransport({ agent });
  }, [client, model]);

  return useChatRuntime({ transport });
}
