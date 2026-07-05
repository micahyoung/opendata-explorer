import { create } from "zustand";
import type { Credentials } from "../../types/credentials";
import { decodeConfigParam } from "./urlConfigCodec";

const PARAM_NAME = "config";

function readAndStripParam(): Credentials | undefined {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get(PARAM_NAME);
  if (!raw) return undefined;

  url.searchParams.delete(PARAM_NAME);
  window.history.replaceState(null, "", url.toString());

  return decodeConfigParam(raw);
}

interface PendingUrlConfigState {
  pendingConfig: Credentials | undefined;
  consume: () => Credentials | undefined;
}

export const usePendingUrlConfig = create<PendingUrlConfigState>((set, get) => ({
  pendingConfig: readAndStripParam(),
  consume: () => {
    const current = get().pendingConfig;
    set({ pendingConfig: undefined });
    return current;
  },
}));
