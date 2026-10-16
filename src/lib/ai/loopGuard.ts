/** The slice of an AI SDK step the guard reads. */
export interface GuardStep {
  toolCalls: ReadonlyArray<{ toolName: string; input: unknown }>;
  toolResults: ReadonlyArray<{ output: unknown }>;
  content?: ReadonlyArray<{ type: string }>;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** What a step asked for: tool name plus arguments, independent of argument key order and of the order of parallel calls. */
export function callSignature(step: GuardStep): string {
  return step.toolCalls
    .map((c) => `${c.toolName}${stableStringify(c.input)}`)
    .sort()
    .join("\n");
}

function succeeded(step: GuardStep): boolean {
  if (step.content?.some((p) => p.type === "tool-error")) return false;
  if (step.toolResults.length < step.toolCalls.length) return false;
  return step.toolResults.every((r) => !(r.output && typeof r.output === "object" && (r.output as { success?: unknown }).success === false));
}

/**
 * True when the latest step made exactly the tool calls an earlier step in this run already made successfully. Repeating a call
 * that worked cannot add information; the model should answer from the result it already has.
 */
export function isRepeatedCall(steps: ReadonlyArray<GuardStep>): boolean {
  const latest = steps.at(-1);
  if (!latest || latest.toolCalls.length === 0) return false;
  const signature = callSignature(latest);
  return steps.slice(0, -1).some((s) => s.toolCalls.length > 0 && succeeded(s) && callSignature(s) === signature);
}
