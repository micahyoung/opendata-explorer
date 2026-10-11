import { create } from "zustand";
import { MODEL_DTYPE, MODEL_ID } from "../../../config/localModel";
import type { StepTrace } from "./types";

/** Older steps are dropped so a long session cannot grow without bound. */
export const MAX_LOGGED_STEPS = 50;

interface SessionLogState {
  steps: StepTrace[];
  add: (trace: StepTrace) => void;
  clear: () => void;
}

/** What the on-device model received and produced, step by step, for the current conversation. Memory only. */
export const useSessionLog = create<SessionLogState>((set) => ({
  steps: [],
  add: (trace) =>
    set((s) => {
      const base = trace.coldReason === "new conversation" ? [] : s.steps;
      return { steps: [...base, trace].slice(-MAX_LOGGED_STEPS) };
    }),
  clear: () => set({ steps: [] }),
}));

export interface SessionLogMeta {
  commit: string;
  builtAt: string;
  transformersVersion: string;
  capturedAt: string;
}

export function buildSessionLogFile(steps: StepTrace[], meta: SessionLogMeta) {
  return {
    app: { commit: meta.commit, builtAt: meta.builtAt },
    model: { id: MODEL_ID, dtype: MODEL_DTYPE },
    transformersVersion: meta.transformersVersion,
    capturedAt: meta.capturedAt,
    steps,
  };
}

/** Saves the log as a JSON file on the user's device. Nothing is sent anywhere. */
export function downloadSessionLog() {
  const now = new Date();
  const file = buildSessionLogFile(useSessionLog.getState().steps, {
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
