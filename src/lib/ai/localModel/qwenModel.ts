import type { LanguageModelV3, LanguageModelV3StreamPart } from "@ai-sdk/provider";
import type { FunctionTool } from "./aiTypes";
import { parseQwenOutput, toQwenMessages } from "./qwenPrompt";
import type { GenerateResult, LocalEngine } from "./types";

export interface QwenModelOptions {
  engine: LocalEngine;
  modelId: string;
  maxTokens: number;
  maxToolResultChars: number;
}

/**
 * An AI SDK language model over a Qwen3.5 inference engine. Qwen's native XML tool-call format is parsed into SDK tool calls;
 * the whole step is generated before anything is emitted (no token streaming). Greedy decoding, thinking off.
 */
export function createQwenLanguageModel({ engine, modelId, maxTokens, maxToolResultChars }: QwenModelOptions): LanguageModelV3 {
  let callSeq = 0;

  async function complete(options: Parameters<LanguageModelV3["doGenerate"]>[0]) {
    const tools = (options.tools ?? []).filter((t): t is FunctionTool => t.type === "function");
    const messages = toQwenMessages(options.prompt, tools, maxToolResultChars);
    const result = await engine.generate(
      { messages, maxTokens: options.maxOutputTokens ?? maxTokens, thinking: false },
      options.abortSignal,
    );
    const parsed = parseQwenOutput(result.raw, tools);
    const callIds = parsed.calls.map(() => `call_${++callSeq}`);
    return { parsed, callIds, result, finish: finishReason(result, parsed.calls.length > 0) };
  }

  const usageOf = (r: GenerateResult) => ({
    inputTokens: { total: r.promptTokens, noCache: r.promptTokens, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: r.completionTokens, text: r.completionTokens, reasoning: undefined },
  });

  return {
    specificationVersion: "v3",
    provider: "local-qwen",
    modelId,
    supportedUrls: {},

    async doGenerate(options) {
      const { parsed, callIds, result, finish } = await complete(options);
      return {
        content: [
          ...(parsed.text ? [{ type: "text" as const, text: parsed.text }] : []),
          ...parsed.calls.map((c, i) => ({
            type: "tool-call" as const,
            toolCallId: callIds[i],
            toolName: c.name,
            input: JSON.stringify(c.input),
          })),
        ],
        finishReason: finish,
        usage: usageOf(result),
        warnings: [],
      };
    },

    async doStream(options) {
      const { parsed, callIds, result, finish } = await complete(options);
      const parts: LanguageModelV3StreamPart[] = [{ type: "stream-start", warnings: [] }];
      if (parsed.text) {
        parts.push({ type: "text-start", id: "t0" }, { type: "text-delta", id: "t0", delta: parsed.text }, { type: "text-end", id: "t0" });
      }
      parsed.calls.forEach((c, i) =>
        parts.push({ type: "tool-call", toolCallId: callIds[i], toolName: c.name, input: JSON.stringify(c.input) }),
      );
      parts.push({ type: "finish", usage: usageOf(result), finishReason: finish });
      return {
        stream: new ReadableStream<LanguageModelV3StreamPart>({
          start(controller) {
            for (const p of parts) controller.enqueue(p);
            controller.close();
          },
        }),
      };
    },
  };
}

function finishReason(result: GenerateResult, hasCalls: boolean) {
  const unified = hasCalls ? ("tool-calls" as const) : result.finish === "length" ? ("length" as const) : ("stop" as const);
  return { unified, raw: result.finish };
}
