import { Experimental_Agent as ToolLoopAgent, stepCountIs } from "ai";
import { buildSystemPrompt } from "../src/lib/ai/systemPrompt";
import { tools } from "../src/lib/ai/tools";
import type { BenchPrompt } from "./prompts";

export async function runOne(model: unknown, prompt: BenchPrompt, maxSteps: number) {
  const agent = new ToolLoopAgent({
    model: model as never,
    instructions: buildSystemPrompt(),
    tools,
    stopWhen: stepCountIs(maxSteps),
  });

  const t0 = performance.now();
  const calls: { name: string; input: unknown; invalid: boolean }[] = [];
  const results: { name: string; success?: boolean; errorKind?: string }[] = [];
  const detail: { name: string; keys: string[]; invalid: boolean; why?: string; input?: string }[] = [];
  const errorText: string[] = [];
  const steps: { ttftMs: number; decodeMs: number; inTok?: number; outTok?: number }[] = [];
  let stepStart = t0;
  let firstTok = 0;
  let finalText = "";
  let error: string | undefined;

  try {
    const res = await agent.stream({ prompt: prompt.text });
    for await (const part of res.fullStream) {
      const now = performance.now();
      const p = part as Record<string, any>;
      if (p.type === "start-step") {
        stepStart = now;
        firstTok = 0;
      } else if (["text-delta", "tool-input-start", "tool-call", "reasoning-delta"].includes(p.type) && !firstTok) {
        firstTok = now;
      } else if (p.type === "finish-step") {
        steps.push({
          ttftMs: Math.round((firstTok || now) - stepStart),
          decodeMs: Math.round(now - (firstTok || now)),
          inTok: p.usage?.inputTokens,
          outTok: p.usage?.outputTokens,
        });
      }
      if (p.type === "tool-call") {
        calls.push({ name: p.toolName, input: p.input, invalid: !!p.invalid });
        detail.push({ name: p.toolName, keys: Object.keys((p.input as object) ?? {}), invalid: !!p.invalid, why: p.invalid ? String(p.error?.message ?? "").slice(0, 300) : undefined, input: JSON.stringify(p.input ?? {}).slice(0, 400) });
      }
      if (p.type === "tool-result") {
        const o = p.output as { success?: boolean; error?: { kind?: string; message?: string } } | undefined;
        results.push({ name: p.toolName, success: Array.isArray(o) ? undefined : o?.success, errorKind: o?.error?.kind });
        if (o?.error?.message) errorText.push(`${p.toolName}: ${String(o.error.message).slice(0, 300)}`);
      }
      if (p.type === "tool-error") {
        results.push({ name: p.toolName, success: false, errorKind: `thrown:${String(p.error?.name ?? "Error")}` });
      }
      if (p.type === "text-delta") finalText += p.text ?? "";
      if (p.type === "error") error = String(p.error?.message ?? p.error);
    }
  } catch (e) {
    error = String((e as Error).message ?? e);
  }

  const names = calls.map((c) => c.name);
  const fetchCalls = calls.filter((c) => c.name.startsWith("fetch"));
  const firstFetchIdx = names.findIndex((n) => n.startsWith("fetch"));
  const detailsIdx = names.indexOf("getDatasetDetails");
  return {
    prompt: prompt.id,
    totalMs: Math.round(performance.now() - t0),
    steps,
    toolSequence: names,
    detail,
    errorText,
    invalidCalls: calls.filter((c) => c.invalid).length,
    hasExpectedTools: prompt.expectTools.every((t) => names.includes(t)),
    detailsBeforeFetch: firstFetchIdx === -1 ? null : detailsIdx !== -1 && detailsIdx < firstFetchIdx,
    rightDataset: prompt.expectDataset ? fetchCalls.some((c) => (c.input as any)?.datasetId === prompt.expectDataset) : null,
    querySucceeded: results.some((r) => r.name.startsWith("fetch") && r.success === true),
    errorKinds: results.filter((r) => r.errorKind).map((r) => r.errorKind),
    finalText: finalText.slice(0, 400),
    error,
  };
}
