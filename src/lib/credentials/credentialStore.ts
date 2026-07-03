import { credentialsSchema, type Credentials } from "../../types/credentials";

const STORAGE_KEY = "opendata-explorer:credentials";

export function getCredentials(): Credentials | undefined {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;

  try {
    return credentialsSchema.parse(JSON.parse(raw));
  } catch {
    // Corrupt or outdated stored value — treat as unset so onboarding re-shows.
    localStorage.removeItem(STORAGE_KEY);
    return undefined;
  }
}

export function setCredentials(credentials: Credentials): void {
  credentialsSchema.parse(credentials);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

export function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}
