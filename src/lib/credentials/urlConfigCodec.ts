import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { credentialsSchema, type Credentials } from "../../types/credentials";
import { decryptForHost, encryptForHost } from "./hostCipher";

export async function encodeConfigParam(credentials: Credentials): Promise<string> {
  const compressed = compressToEncodedURIComponent(JSON.stringify(credentials));
  return encryptForHost(compressed, window.location.hostname);
}

export async function decodeConfigParam(raw: string): Promise<Credentials | undefined> {
  try {
    const compressed = await decryptForHost(raw, window.location.hostname);
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) return undefined;
    return credentialsSchema.parse(JSON.parse(json));
  } catch {
    return undefined;
  }
}
