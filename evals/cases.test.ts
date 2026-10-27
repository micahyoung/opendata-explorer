import { describe, expect, it } from "vitest";
import { getDatasetDetailsTool, lookupDatasetDetails } from "../src/lib/ai/tools";
import { cases } from "./cases";

describe("eval cases", () => {
  it("has unique ids and builds a system-first, user-last conversation", () => {
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
    for (const c of cases) {
      const messages = c.messages();
      expect(messages[0].role, c.id).toBe("system");
      expect(messages.at(-1)!.role, c.id).toBe("user");
    }
  });
});

describe("lookupDatasetDetails", () => {
  it("is what the getDatasetDetails tool returns", async () => {
    const ids = ["nyc-311-service-requests", "no-such-dataset"];
    const viaTool = await getDatasetDetailsTool.execute!({ datasetIds: ids }, { toolCallId: "t", messages: [], context: {} as never });
    expect(viaTool).toEqual(lookupDatasetDetails(ids));
  });
});
