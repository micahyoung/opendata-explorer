/** Shown when the agent loop hits its step cap while still calling tools: the run ends without the model having said anything. */
export const OUT_OF_STEPS_MESSAGE =
  "I wandered around the map for a while on that one and couldn't pin it down. Try asking a bit more narrowly (a specific place, a dataset, or a filter) and I'll take another look.";

interface Chunk {
  type: string;
  finishReason?: string;
}

/**
 * Passes a UI message stream through, adding a fixed closing message just before it finishes if the run ended on a tool call
 * (the step cap stopped it). Whatever the model improvises at that point is not worth showing: it is usually more retrying.
 */
export function withOutOfStepsNotice<T extends Chunk>(stream: ReadableStream<T>): ReadableStream<T> {
  return stream.pipeThrough(
    new TransformStream<T, T>({
      transform(chunk, controller) {
        if (chunk.type === "finish" && chunk.finishReason === "tool-calls") {
          const id = "out-of-steps";
          controller.enqueue({ type: "text-start", id } as unknown as T);
          controller.enqueue({ type: "text-delta", id, delta: OUT_OF_STEPS_MESSAGE } as unknown as T);
          controller.enqueue({ type: "text-end", id } as unknown as T);
        }
        controller.enqueue(chunk);
      },
    }),
  );
}
