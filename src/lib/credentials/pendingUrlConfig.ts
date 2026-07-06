import { create } from "zustand";
import type { Credentials } from "../../types/credentials";
import { decodeConfigParam } from "./urlConfigCodec";

const PARAM_NAME = "config";

function stripParam(): string | undefined {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get(PARAM_NAME);
  if (!raw) return undefined;

  url.searchParams.delete(PARAM_NAME);
  window.history.replaceState(null, "", url.toString());

  return raw;
}

interface PendingUrlConfigState {
  pendingConfig: Credentials | undefined;
  status: "loading" | "ready";
  consume: () => Credentials | undefined;
}

export const usePendingUrlConfig = create<PendingUrlConfigState>((set, get) => {
  const raw = stripParam();

  if (raw) {
    decodeConfigParam(raw).then((pendingConfig) => set({ pendingConfig, status: "ready" }));
  }

  return {
    pendingConfig: undefined,
    status: raw ? "loading" : "ready",
    consume: () => {
      const current = get().pendingConfig;
      set({ pendingConfig: undefined });
      return current;
    },
  };
});
