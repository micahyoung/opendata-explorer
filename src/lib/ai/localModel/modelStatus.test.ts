import { describe, expect, it } from "vitest";
import { MODEL_DOWNLOAD_BYTES } from "../../../config/localModel";
import { checkCapability, type CapabilityEnv } from "./modelStatus";

const adapter = (features: string[]) => ({ features: new Set(features) });

describe("checkCapability", () => {
  it("fails without WebGPU", async () => {
    const r = await checkCapability({});
    expect(r.ok).toBe(false);
  });

  it("fails without an adapter", async () => {
    const env: CapabilityEnv = { gpu: { requestAdapter: async () => null } };
    expect(await checkCapability(env)).toMatchObject({ ok: false, reason: expect.stringContaining("adapter") });
  });

  it("fails without shader-f16", async () => {
    const env: CapabilityEnv = { gpu: { requestAdapter: async () => adapter([]) } };
    expect(await checkCapability(env)).toMatchObject({ ok: false, reason: expect.stringContaining("shader-f16") });
  });

  it("fails when the storage quota is too small for the download", async () => {
    const env: CapabilityEnv = {
      gpu: { requestAdapter: async () => adapter(["shader-f16"]) },
      storage: { estimate: async () => ({ quota: MODEL_DOWNLOAD_BYTES / 2 }) },
    };
    expect(await checkCapability(env)).toMatchObject({ ok: false, reason: expect.stringContaining("storage") });
  });

  it("passes with shader-f16 and enough storage", async () => {
    const env: CapabilityEnv = {
      gpu: { requestAdapter: async () => adapter(["shader-f16"]) },
      storage: { estimate: async () => ({ quota: MODEL_DOWNLOAD_BYTES * 3 }) },
    };
    expect(await checkCapability(env)).toEqual({ ok: true });
  });
});
