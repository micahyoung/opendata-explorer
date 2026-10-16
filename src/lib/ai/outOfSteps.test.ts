import { describe, expect, it } from "vitest";
import { OUT_OF_STEPS_MESSAGE, withOutOfStepsNotice } from "./outOfSteps";

type Chunk = { type: string; finishReason?: string; delta?: string };

async function run(chunks: Chunk[]) {
  const source = new ReadableStream<Chunk>({
    start(c) {
      chunks.forEach((x) => c.enqueue(x));
      c.close();
    },
  });
  const out: Chunk[] = [];
  const reader = withOutOfStepsNotice(source).getReader();
  for (let r = await reader.read(); !r.done; r = await reader.read()) out.push(r.value);
  return out;
}

describe("withOutOfStepsNotice", () => {
  it("adds the fixed message before the finish chunk when the run ended on a tool call", async () => {
    const out = await run([{ type: "start" }, { type: "finish", finishReason: "tool-calls" }]);
    expect(out.map((c) => c.type)).toEqual(["start", "text-start", "text-delta", "text-end", "finish"]);
    expect(out.find((c) => c.type === "text-delta")?.delta).toBe(OUT_OF_STEPS_MESSAGE);
  });

  it("leaves a run that ended with an answer alone", async () => {
    const chunks = [{ type: "start" }, { type: "finish", finishReason: "stop" }];
    expect(await run(chunks)).toEqual(chunks);
  });
});
