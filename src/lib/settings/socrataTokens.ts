import { create } from "zustand";

const STORAGE_KEY = "opendata-explorer:socrata-tokens";
/** Where earlier versions kept encrypted LLM API keys. Nothing reads it any more, so it is deleted on startup. */
const LEGACY_CREDENTIALS_KEY = "opendata-explorer:credentials";

function load(): Record<string, string> {
  try {
    localStorage.removeItem(LEGACY_CREDENTIALS_KEY);
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === "string"));
  } catch {
    return {};
  }
}

interface SocrataTokensState {
  /** Socrata app token per domain; raises that domain's API rate limit. */
  tokens: Record<string, string>;
  save: (tokens: Record<string, string>) => void;
}

export const useSocrataTokens = create<SocrataTokensState>((set) => ({
  tokens: load(),
  save: (tokens) => {
    const cleaned = Object.fromEntries(Object.entries(tokens).filter(([, v]) => v.trim() !== ""));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    } catch {
      // Storage unavailable (private mode, quota): the tokens still apply for this session.
    }
    set({ tokens: cleaned });
  },
}));
