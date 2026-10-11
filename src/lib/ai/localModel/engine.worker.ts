/// <reference lib="webworker" />
import type { ProgressInfo } from "@huggingface/transformers";
import { loadEngine, type Engine } from "./engineCore";
import type { GenerateRequest, GenerateResult } from "./types";

export type WorkerRequest =
  | { type: "load" }
  | { type: "generate"; id: number; req: GenerateRequest }
  | { type: "abort"; id: number }
  | { type: "reset" };

export type WorkerResponse =
  | { type: "progress"; info: ProgressInfo }
  | { type: "loaded" }
  | { type: "result"; id: number; result: GenerateResult }
  | { type: "error"; id?: number; message: string; aborted?: boolean };

const post = (m: WorkerResponse) => self.postMessage(m);
const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

let engine: Promise<Engine> | undefined;
const inflight = new Map<number, AbortController>();

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  switch (msg.type) {
    case "load":
      engine ??= loadEngine((info) => post({ type: "progress", info }));
      try {
        await engine;
        post({ type: "loaded" });
      } catch (e) {
        engine = undefined;
        post({ type: "error", message: messageOf(e) });
      }
      return;
    case "generate": {
      const controller = new AbortController();
      inflight.set(msg.id, controller);
      try {
        if (!engine) throw new Error("The model is not loaded.");
        const result = await (await engine).generate(msg.req, controller.signal);
        post({ type: "result", id: msg.id, result });
      } catch (e) {
        post({ type: "error", id: msg.id, message: messageOf(e), aborted: controller.signal.aborted });
      } finally {
        inflight.delete(msg.id);
      }
      return;
    }
    case "abort":
      inflight.get(msg.id)?.abort();
      return;
    case "reset":
      await (await engine)?.reset();
      return;
  }
};
