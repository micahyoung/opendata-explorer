import { describe, expect, it } from "vitest";
import { datasets, type DatasetDefinition } from "../src/config/datasets";
import { FETCH_TOOL, expectText, expectToolCall, gradeFetch, gradeRoute, unknownFieldsInClause, type Outcome } from "./grade";

function exemplarInput(dataset: DatasetDefinition, n: number): Record<string, unknown> {
  const exemplar = dataset.exemplars[n];
  return { datasetId: dataset.id, ...("soql" in exemplar ? exemplar.soql : exemplar.query) };
}

const call = (name: string, input: Record<string, unknown>): Outcome => ({ kind: "tool_call", name, input });

describe("gradeFetch", () => {
  // The catalog's own known-good queries double as a check that the grader has no false positives.
  it("accepts every exemplar of every dataset", () => {
    const rejected = datasets.flatMap((dataset) =>
      dataset.exemplars.flatMap((_, n) => {
        const grade = gradeFetch(dataset, call(FETCH_TOOL[dataset.backend], exemplarInput(dataset, n)));
        return grade.ok ? [] : [`${dataset.id} #${n}: ${grade.detail}`];
      }),
    );
    expect(rejected).toEqual([]);
  });

  const nyc = datasets.find((d) => d.id === "nyc-311-service-requests")!;

  it("rejects the wrong backend's tool, a text reply and a wrong dataset", () => {
    expect(gradeFetch(nyc, call("fetchArcGisData", { datasetId: nyc.id })).ok).toBe(false);
    expect(gradeFetch(nyc, { kind: "text", text: "Here you go" }).ok).toBe(false);
    expect(gradeFetch(nyc, call("fetchSocrataData", { datasetId: "baltimore-red-light-cameras" })).ok).toBe(false);
  });

  it("rejects arguments that break the tool schema", () => {
    expect(gradeFetch(nyc, call("fetchSocrataData", { datasetId: nyc.id, limit: "ten" })).ok).toBe(false);
  });

  it("rejects a hallucinated column in where, select or order", () => {
    for (const bad of [{ where: "complaint = 'Noise'" }, { select: "complaint, borough" }, { order: "nonexistent DESC" }]) {
      const grade = gradeFetch(nyc, call("fetchSocrataData", { datasetId: nyc.id, ...bad }));
      expect(grade.ok, JSON.stringify(bad)).toBe(false);
    }
  });
});

describe("unknownFieldsInClause", () => {
  const known = new Set(["borough", "complaint_type", "created_date"]);

  it("ignores string literals, keywords, functions and numeric comparisons", () => {
    expect(unknownFieldsInClause("borough = 'QUEENS' AND complaint_type like '%Noise = x%'", known)).toEqual([]);
    expect(unknownFieldsInClause("upper(borough) = 'QUEENS' OR 1=1", known)).toEqual([]);
    expect(unknownFieldsInClause("created_date > '2024-01-01' AND borough IN ('BRONX')", known)).toEqual([]);
    expect(unknownFieldsInClause("created_date::number > 24", known)).toEqual([]);
  });

  it("reports compared names that are not fields", () => {
    expect(unknownFieldsInClause("boro = 'QUEENS' AND complaint_type = 'x'", known)).toEqual(["boro"]);
  });
});

describe("gradeRoute", () => {
  it("accepts a getDatasetDetails call that includes the dataset", () => {
    expect(gradeRoute("a", call("getDatasetDetails", { datasetIds: ["b", "a"] })).ok).toBe(true);
  });

  it("rejects other datasets, other tools and a non-array", () => {
    expect(gradeRoute("a", call("getDatasetDetails", { datasetIds: ["b"] })).ok).toBe(false);
    expect(gradeRoute("a", call("fetchSocrataData", { datasetId: "a" })).ok).toBe(false);
    expect(gradeRoute("a", call("getDatasetDetails", { datasetIds: "a" })).ok).toBe(false);
  });
});

describe("expectToolCall / expectText", () => {
  it("applies the input check only to the right tool", () => {
    expect(expectToolCall(call("x", { n: 1 }), "x", (i) => (i.n === 1 ? undefined : "bad")).ok).toBe(true);
    expect(expectToolCall(call("x", { n: 2 }), "x", (i) => (i.n === 1 ? undefined : "bad")).ok).toBe(false);
    expect(expectToolCall({ kind: "empty" }, "x").ok).toBe(false);
  });

  it("separates text from tool calls", () => {
    expect(expectText({ kind: "text", text: "hi" }).ok).toBe(true);
    expect(expectText(call("x", {})).ok).toBe(false);
  });
});
