import { useMemo } from "react";
import { Experimental_Agent as ToolLoopAgent, stepCountIs } from "ai";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { MAX_OUTPUT_TOKENS, MAX_TOOL_RESULT_CHARS, MODEL_ID } from "../../config/localModel";
import { ActiveResultsAwareChatTransport } from "./activeResultsAwareChatTransport";
import { engineClient } from "./localModel/engineClient";
import { createQwenLanguageModel } from "./localModel/qwenModel";
import { isRepeatedCall } from "./loopGuard";
import { buildSystemPrompt } from "./systemPrompt";
import { tools } from "./tools";

const MAX_AGENT_STEPS = 8;

/**
 * Wires assistant-ui's chat runtime directly to an in-browser agent (no server route) via ActiveResultsAwareChatTransport, so
 * the whole request/response/tool loop happens client-side against the on-device model. The transport is created once and never
 * changes; whether the model is loaded yet is the engine's concern (it rejects a step until then, and ChatPanel hides the
 * composer until the model is ready).
 */
export function useOpenDataChatRuntime() {
  const transport = useMemo(() => {
    const agent = new ToolLoopAgent({
      model: createQwenLanguageModel({
        engine: engineClient,
        modelId: MODEL_ID,
        maxTokens: MAX_OUTPUT_TOKENS,
        maxToolResultChars: MAX_TOOL_RESULT_CHARS,
      }),
      instructions: buildSystemPrompt(),
      tools,
      stopWhen: stepCountIs(MAX_AGENT_STEPS),
      // The on-device model tends to re-issue a call that already succeeded instead of answering. Once it does, force a text reply.
      prepareStep: ({ steps }) => (isRepeatedCall(steps) ? { toolChoice: "none" } : undefined),
    });
    return new ActiveResultsAwareChatTransport({ agent });
  }, []);

  return useChatRuntime({ transport });
}
