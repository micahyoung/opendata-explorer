import type { ChatMessage } from "./types";

export const IM_END = "<|im_end|>";

/** One finished generation: the assistant header the prompt ended with, and the raw text the model produced after it. */
export interface Generation {
  header: string;
  raw: string;
}

export type ColdReason = "new conversation" | "assistant turn count mismatch" | "prefix mismatch";

/** The generation prompt. With thinking off, Qwen3.5's template pre-closes an empty think block. */
export function generationHeader(thinking: boolean): string {
  return `<|im_start|>assistant\n${thinking ? "<think>\n" : "<think>\n\n</think>\n\n"}`;
}

/**
 * Renders chat messages as Qwen ChatML. Earlier assistant turns are replaced by the model's own raw output (`gens`, in order)
 * where available: the agent wrapper re-renders them from parsed tool calls, which would not match the cached tokens exactly.
 */
export function renderChatml(messages: ChatMessage[], gens: Generation[], thinking: boolean): string {
  const header = generationHeader(thinking);
  let j = 0;
  return (
    messages
      .map((m) => {
        if (m.role !== "assistant") return `<|im_start|>${m.role}\n${m.content}${IM_END}\n`;
        const g = gens[j++];
        if (g) return g.header + g.raw + (g.raw.endsWith(IM_END) ? "\n" : `${IM_END}\n`);
        return `${header}${m.content}${IM_END}\n`;
      })
      .join("") + header
  );
}

export interface RenderPlan {
  text: string;
  /** Set when the cached tokens cannot be extended and the whole prompt must be prefilled. */
  cold?: ColdReason;
}

/**
 * Decides how to serve a request given what the engine already holds. `cachedText` is the text the KV cache covers (prompt plus
 * generated output of the previous step). The plan is warm only when the new prompt starts with exactly that text.
 */
export function planPrompt(messages: ChatMessage[], gens: Generation[], cachedText: string | undefined, thinking: boolean): RenderPlan {
  const assistantTurns = messages.filter((m) => m.role === "assistant").length;
  if (assistantTurns === 0) return { text: renderChatml(messages, [], thinking), cold: "new conversation" };
  if (assistantTurns !== gens.length) return { text: renderChatml(messages, [], thinking), cold: "assistant turn count mismatch" };
  const text = renderChatml(messages, gens, thinking);
  if (cachedText === undefined || !text.startsWith(cachedText)) return { text, cold: "prefix mismatch" };
  return { text };
}
