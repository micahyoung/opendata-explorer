import { create } from "zustand";
import { MODEL_DOWNLOAD_BYTES } from "../../../config/localModel";

export type ModelPhase = "checking" | "unsupported" | "idle" | "downloading" | "initializing" | "ready" | "error";

export type Capability = { ok: true } | { ok: false; reason: string };

interface GpuAdapterLike {
  features: { has(name: string): boolean };
}

/** The slice of `navigator` the check reads, so tests can supply a fake. */
export interface CapabilityEnv {
  gpu?: { requestAdapter(): Promise<GpuAdapterLike | null> };
  storage?: { estimate(): Promise<{ quota?: number }> };
}

/** Can this browser run the model? Needs WebGPU with shader-f16 (fp16 weights) and room to cache the download. */
export async function checkCapability(env: CapabilityEnv = navigator as unknown as CapabilityEnv): Promise<Capability> {
  if (!env.gpu) return { ok: false, reason: "This browser has no WebGPU support. Use a recent Chrome or Edge on a desktop." };
  const adapter = await env.gpu.requestAdapter().catch(() => null);
  if (!adapter) return { ok: false, reason: "No WebGPU adapter is available on this device." };
  if (!adapter.features.has("shader-f16")) {
    return { ok: false, reason: "This GPU does not support 16-bit shaders (shader-f16), which the model needs." };
  }
  const quota = (await env.storage?.estimate().catch(() => undefined))?.quota;
  if (quota !== undefined && quota < MODEL_DOWNLOAD_BYTES) {
    return { ok: false, reason: "This browser does not have enough storage available to cache the model." };
  }
  return { ok: true };
}

interface ModelStatusState {
  phase: ModelPhase;
  /** Why the model cannot run (phase "unsupported") or failed to load (phase "error"). */
  message: string | undefined;
  loadedBytes: number;
  totalBytes: number;
  set: (patch: Partial<Omit<ModelStatusState, "set">>) => void;
}

export const useModelStatus = create<ModelStatusState>((set) => ({
  phase: "checking",
  message: undefined,
  loadedBytes: 0,
  totalBytes: 0,
  set: (patch) => set(patch),
}));
