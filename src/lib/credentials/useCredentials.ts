import { create } from "zustand";
import type { Credentials } from "../../types/credentials";
import { clearCredentials, getCredentials, setCredentials } from "./credentialStore";

interface CredentialsState {
  credentials: Credentials | undefined;
  save: (credentials: Credentials) => void;
  clear: () => void;
}

/**
 * Reactive wrapper around credentialStore's localStorage read/write, so that
 * SettingsPanel edits propagate immediately to anything reading credentials
 * (e.g. the memoized AI client) without requiring a page reload.
 */
export const useCredentials = create<CredentialsState>((set) => {
  getCredentials().then((credentials) => set({ credentials }));

  return {
    credentials: undefined,
    save: (credentials) => {
      setCredentials(credentials); // fire-and-forget write; state updates optimistically below
      set({ credentials });
    },
    clear: () => {
      clearCredentials();
      set({ credentials: undefined });
    },
  };
});
