import { create } from "zustand";
import { MODEL_DTYPE, MODEL_ID } from "../../../config/localModel";
import { parseQwenOutput } from "./qwenPrompt";
import type { GenerateRequest, StepTrace } from "./types";

/** Older steps are dropped so a long session cannot grow without bound. */
export const MAX_LOGGED_STEPS = 50;

export type LogBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

/** Shaped like a line of a Claude Code session file; `rawOutput` and `engine` are ours. */
export interface LogEvent {
  type: "user" | "assistant";
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  message: { role: "user" | "assistant"; content: LogBlock[] };
  /** Assistant only: the exact decoded generation, special tokens kept. */
  rawOutput?: string;
  engine?: Omit<StepTrace, "rawOutput" | "startedAt">;
}

export interface LogState {
  system?: string;
  events: LogEvent[];
  /** How many of the request's messages are already logged. */
  seen: number;
  toolSeq: number;
}

const empty = (): LogState => ({ events: [], seen: 0, toolSeq: 0 });

const TOOL_RESPONSE = /<tool_response>\n?([\s\S]*?)\n?<\/tool_response>/g;

/**
 * Folds one engine step into the transcript. Each message is written once: messages the previous step already saw are skipped,
 * and the assistant turns in the request are skipped because they are re-renderings of what was logged from `rawOutput`.
 * Tool-call arguments are parsed without the tools' schemas, so a numeric-looking string parameter may show as a number here;
 * `rawOutput` always has the exact text.
 */
export function recordStep(prev: LogState, req: GenerateRequest, trace: StepTrace): LogState {
  const state = trace.coldReason === "new conversation" ? empty() : prev;
  let { system, seen, toolSeq } = state;
  const events = [...state.events];
  const push = (type: LogEvent["type"], content: LogBlock[], timestamp: string, extra: Partial<LogEvent> = {}) => {
    events.push({
      type,
      uuid: crypto.randomUUID(),
      parentUuid: events.at(-1)?.uuid ?? null,
      timestamp,
      message: { role: type, content },
      ...extra,
    });
  };
  const lastToolIds = () =>
    (events.findLast((e) => e.type === "assistant")?.message.content ?? []).flatMap((b) => (b.type === "tool_use" ? [b.id] : []));

  for (const m of req.messages.slice(seen)) {
    if (m.role === "system") system = m.content;
    else if (m.role === "user") {
      const results = [...m.content.matchAll(TOOL_RESPONSE)];
      if (results.length) {
        const ids = lastToolIds();
        push(
          "user",
          results.map((r, i) => ({ type: "tool_result", tool_use_id: ids[i] ?? "unknown", content: r[1] })),
          trace.startedAt,
        );
      } else push("user", [{ type: "text", text: m.content }], trace.startedAt);
    }
  }
  seen = req.messages.length;

  const parsed = parseQwenOutput(trace.rawOutput.replace(/<\|im_end\|>|<\|endoftext\|>/g, ""), []);
  const { rawOutput, startedAt, ...engine } = trace;
  push(
    "assistant",
    [
      ...(parsed.text ? [{ type: "text" as const, text: parsed.text }] : []),
      ...parsed.calls.map((c) => ({ type: "tool_use" as const, id: `toolu_${++toolSeq}`, name: c.name, input: c.input })),
    ],
    new Date(Date.parse(startedAt) + trace.ms).toISOString(),
    { rawOutput, engine },
  );

  let trimmed = events;
  while (trimmed.filter((e) => e.type === "assistant").length > MAX_LOGGED_STEPS) {
    trimmed = trimmed.slice(trimmed.findIndex((e) => e.type === "assistant") + 1);
  }
  if (trimmed !== events && trimmed[0]) trimmed[0] = { ...trimmed[0], parentUuid: null };
  return { system, events: trimmed, seen, toolSeq };
}

interface SessionLogStore extends LogState {
  add: (req: GenerateRequest, trace: StepTrace) => void;
  clear: () => void;
}

/** What the on-device model received and produced, for the current conversation. Memory only. */
export const useSessionLog = create<SessionLogStore>((set) => ({
  ...empty(),
  add: (req, trace) => set((s) => recordStep(s, req, trace)),
  clear: () => set(empty()),
}));

export const countSteps = (events: LogEvent[]) => events.filter((e) => e.type === "assistant").length;

export interface SessionLogMeta {
  commit: string;
  builtAt: string;
  transformersVersion: string;
  capturedAt: string;
}

export function buildSessionLogFile(state: Pick<LogState, "system" | "events">, meta: SessionLogMeta) {
  return {
    app: { commit: meta.commit, builtAt: meta.builtAt },
    model: { id: MODEL_ID, dtype: MODEL_DTYPE },
    transformersVersion: meta.transformersVersion,
    capturedAt: meta.capturedAt,
    system: state.system,
    events: state.events,
  };
}

/** Saves the log as a JSON file on the user's device. Nothing is sent anywhere. */
export function downloadSessionLog() {
  const now = new Date();
  const file = buildSessionLogFile(useSessionLog.getState(), {
    commit: __GIT_COMMIT__,
    builtAt: __BUILT_AT__,
    transformersVersion: __TRANSFORMERS_VERSION__,
    capturedAt: now.toISOString(),
  });
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `opendata-session-${now.toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
