import { credentialsSchema, type Credentials } from "../../types/credentials";
import { decryptForHost, encryptForHost } from "./hostCipher";

const STORAGE_KEY = "opendata-explorer:credentials";

export async function getCredentials(): Promise<Credentials | undefined> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;

  try {
    const json = await decryptForHost(raw, window.location.hostname);
    return credentialsSchema.parse(JSON.parse(json));
  } catch {
    // Corrupt, wrong-host, or pre-encryption plaintext value — treat as unset so onboarding re-shows.
    localStorage.removeItem(STORAGE_KEY);
    return undefined;
  }
}

export async function setCredentials(credentials: Credentials): Promise<void> {
  credentialsSchema.parse(credentials);
  const encrypted = await encryptForHost(JSON.stringify(credentials), window.location.hostname);
  localStorage.setItem(STORAGE_KEY, encrypted);
}

export function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}
