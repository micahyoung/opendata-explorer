import { describe, expect, it } from "vitest";
import { fetchModelBytes, sumModelBytes } from "./modelSize";

const tree = [
  { path: "onnx/decoder_model_merged_fp16.onnx", size: 100 },
  { path: "onnx/decoder_model_merged_fp16.onnx_data", size: 1000 },
  { path: "onnx/decoder_model_merged_fp16.onnx_data_1", size: 500 },
  { path: "onnx/embed_tokens_fp16.onnx_data", size: 70 },
  { path: "onnx/vision_encoder_fp16.onnx", size: 3 },
  { path: "onnx/decoder_model_merged_q4f16.onnx_data", size: 999999 },
  { path: "onnx/vision_encoder_q4.onnx", size: 999999 },
];

describe("sumModelBytes", () => {
  it("counts each component's .onnx file and data shards at the configured dtype only", () => {
    expect(sumModelBytes(tree, { embed_tokens: "fp16", vision_encoder: "fp16", decoder_model_merged: "fp16" })).toBe(1673);
  });
  it("follows the dtype per component", () => {
    expect(sumModelBytes(tree, { embed_tokens: "fp16", vision_encoder: "q4", decoder_model_merged: "q4f16" })).toBe(70 + 999999 + 999999);
  });
});

describe("fetchModelBytes", () => {
  const respond = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

  it("sums the listing", async () => {
    expect(await fetchModelBytes(respond(tree))).toBe(1673);
  });
  it("returns undefined on HTTP errors, network errors and empty listings", async () => {
    expect(await fetchModelBytes(respond(tree, false))).toBeUndefined();
    expect(await fetchModelBytes((async () => { throw new Error("offline"); }) as unknown as typeof fetch)).toBeUndefined();
    expect(await fetchModelBytes(respond([]))).toBeUndefined();
  });
});
