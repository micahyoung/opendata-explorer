import type { ProgressInfo } from "@huggingface/transformers";
import type { WorkerRequest, WorkerResponse } from "./engine.worker";
import { fetchModelBytes } from "./modelSize";
import { checkCapability, useModelStatus } from "./modelStatus";
import { useSessionLog } from "./sessionLog";
import type { GenerateRequest, GenerateResult, LocalEngine } from "./types";
import { MODEL_ID } from "../../../config/localModel";

let worker: Worker | undefined;
let nextId = 1;
const pending = new Map<number, { req: GenerateRequest; resolve: (r: GenerateResult) => void; reject: (e: Error) => void }>();
const files = new Map<string, { loaded: number; total: number }>();

const status = () => useModelStatus.getState();

function recordProgress(info: ProgressInfo) {
  if (info.status === "progress") {
    files.set(info.file, { loaded: info.loaded, total: info.total });
  } else if (info.status === "done") {
    const f = files.get(info.file);
    if (f) files.set(info.file, { loaded: f.total, total: f.total });
  } else {
    return;
  }
  let loadedBytes = 0;
  let totalBytes = 0;
  for (const f of files.values()) {
    loadedBytes += f.loaded;
    totalBytes += f.total;
  }
  // Once (nearly) all the weights are in, what remains is compiling them onto the GPU.
  const downloaded = loadedBytes >= status().expectedBytes * 0.99;
  status().set({ loadedBytes, totalBytes, ...(downloaded ? { phase: "initializing" as const } : {}) });
}

function onMessage(event: MessageEvent<WorkerResponse>) {
  const msg = event.data;
  switch (msg.type) {
    case "progress":
      recordProgress(msg.info);
      return;
    case "loaded":
      status().set({ phase: "ready", message: undefined });
      return;
    case "result":
      {
        const entry = pending.get(msg.id);
        if (entry && msg.result.trace) useSessionLog.getState().add(entry.req, msg.result.trace);
        entry?.resolve(msg.result);
      }
      pending.delete(msg.id);
      return;
    case "error":
      if (msg.id === undefined) {
        status().set({ phase: "error", message: msg.message });
        return;
      }
      pending.get(msg.id)?.reject(msg.aborted ? new DOMException("Aborted", "AbortError") : new Error(msg.message));
      pending.delete(msg.id);
      return;
  }
}

function send(msg: WorkerRequest) {
  worker!.postMessage(msg);
}

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./engine.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = onMessage;
  worker.onerror = (e) => status().set({ phase: "error", message: e.message || "The model worker crashed." });
  return worker;
}

/** True when the weights are already in the browser's cache, so loading will not download anything. */
async function isModelCached(): Promise<boolean> {
  try {
    const cache = await caches.open("transformers-cache");
    return (await cache.keys()).some((r) => r.url.includes(MODEL_ID) && r.url.includes(".onnx"));
  } catch {
    return false;
  }
}

/** Fetches (if needed) and loads the model onto the GPU. Safe to call again only from the "idle" or "error" phase. */
export function startDownload(alreadyCached = false) {
  const { phase } = status();
  if (phase !== "idle" && phase !== "error") return;
  files.clear();
  status().set({ phase: alreadyCached ? "initializing" : "downloading", message: undefined, loadedBytes: 0, totalBytes: 0 });
  ensureWorker();
  send({ type: "load" });
}

/** Run once at startup: checks WebGPU support, and loads straight away if the model is already cached (no download involved). */
export async function initLocalModel() {
  const expectedBytes = (await fetchModelBytes()) ?? status().expectedBytes;
  status().set({ expectedBytes });
  const capability = await checkCapability(undefined, expectedBytes);
  if (!capability.ok) {
    status().set({ phase: "unsupported", message: capability.reason });
    return;
  }
  status().set({ phase: "idle" });
  if (await isModelCached()) startDownload(true);
}

/**
 * The chat runtime's engine: forwards each step to the worker, and cancels it there when the signal aborts.
 * `reset` drops the worker's KV cache and generation history so the next step is a cold start. It sends no acknowledgement: the worker
 * clears its state when it reaches the message, ahead of any step posted after it. Evals call it to keep cases independent.
 */
export const engineClient: LocalEngine & { reset(): Promise<void> } = {
  reset() {
    if (worker) send({ type: "reset" });
    return Promise.resolve();
  },
  generate(req: GenerateRequest, signal?: AbortSignal) {
    if (status().phase !== "ready") return Promise.reject(new Error("The on-device model is not loaded yet."));
    if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
    const id = nextId++;
    return new Promise<GenerateResult>((resolve, reject) => {
      pending.set(id, { req, resolve, reject });
      signal?.addEventListener("abort", () => send({ type: "abort", id }), { once: true });
      send({ type: "generate", id, req });
    });
  },
};
