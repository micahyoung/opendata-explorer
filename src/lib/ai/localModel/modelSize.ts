import { MODEL_DTYPE, MODEL_ID } from "../../../config/localModel";

interface TreeEntry {
  path: string;
  size?: number;
}

/**
 * Bytes of the ONNX files the configured dtypes load: for each component `<name>_<dtype>.onnx` plus its external-data shards
 * (`.onnx_data`, `.onnx_data_1`, ...). Tokenizer and config files are negligible and ignored.
 */
export function sumModelBytes(tree: TreeEntry[], dtypes: Record<string, string> = MODEL_DTYPE): number {
  const prefixes = Object.entries(dtypes).map(([component, dtype]) => `onnx/${component}_${dtype}.onnx`);
  return tree.filter((f) => prefixes.some((p) => f.path.startsWith(p))).reduce((sum, f) => sum + (f.size ?? 0), 0);
}

/**
 * Asks Hugging Face how big the download is (one tree-listing request, CORS-enabled). Returns undefined on any failure or an
 * implausible answer so callers can fall back to MODEL_DOWNLOAD_BYTES_FALLBACK; it must never block using an already-cached model.
 */
export async function fetchModelBytes(fetchImpl: typeof fetch = fetch): Promise<number | undefined> {
  try {
    const res = await fetchImpl(`https://huggingface.co/api/models/${MODEL_ID}/tree/main/onnx`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return undefined;
    const bytes = sumModelBytes((await res.json()) as TreeEntry[]);
    return bytes > 0 ? bytes : undefined;
  } catch {
    return undefined;
  }
}
