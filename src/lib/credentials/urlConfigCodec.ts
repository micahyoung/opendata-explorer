import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { credentialsSchema, type Credentials } from "../../types/credentials";

export function encodeConfigParam(credentials: Credentials): string {
  return compressToEncodedURIComponent(JSON.stringify(credentials));
}

export function decodeConfigParam(raw: string): Credentials | undefined {
  try {
    const json = decompressFromEncodedURIComponent(raw);
    if (!json) return undefined;
    return credentialsSchema.parse(JSON.parse(json));
  } catch {
    return undefined;
  }
}
