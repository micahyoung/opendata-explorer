import { describe, expect, it } from "vitest";
import { shouldAttachActiveResultsNote } from "./activeResultsSignal";

describe("shouldAttachActiveResultsNote", () => {
  it("is skipped on an empty map even though the map moved", () => {
    expect(shouldAttachActiveResultsNote(true, 0)).toBe(false);
  });
  it("is attached when the map changed and layers exist", () => {
    expect(shouldAttachActiveResultsNote(true, 2)).toBe(true);
  });
  it("is skipped when nothing changed", () => {
    expect(shouldAttachActiveResultsNote(false, 2)).toBe(false);
  });
});
