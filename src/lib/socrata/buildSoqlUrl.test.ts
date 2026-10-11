import { describe, expect, it } from "vitest";
import { getDataset } from "../../config/datasets";
import type { SocrataDatasetDefinition } from "../../config/datasets";
import { buildSoqlUrl } from "./buildSoqlUrl";

describe("buildSoqlUrl", () => {
  it("addresses the Socrata resource by resourceId, not the model-facing slug id", () => {
    const dataset = getDataset("nyc-tree-census") as SocrataDatasetDefinition;
    const url = buildSoqlUrl(dataset, { datasetId: dataset.id, where: "status = 'Dead'" });
    expect(new URL(url).pathname).toBe("/resource/uvpi-gqnh.json");
  });
});
