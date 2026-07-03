import { tool } from "ai";
import { z } from "zod";
import { datasetIds, getDataset } from "../../config/datasets";
import { useMapLayersStore } from "../mapState/mapLayersStore";
import { buildSoqlUrl } from "../socrata/buildSoqlUrl";
import { fetchSocrata } from "../socrata/fetchSocrata";
import { SocrataHttpError, TimeoutError } from "../utils/errors";

const inputSchema = z.object({
  datasetId: z.enum(datasetIds).describe("The Socrata dataset ID to query. Must be one of the supported datasets."),
  select: z.string().optional().describe("Comma-separated $select column list. Omit to select all columns."),
  where: z.string().optional().describe("A raw SoQL $where clause body, e.g. borough = 'QUEENS'."),
  order: z.string().optional().describe("A raw SoQL $order clause, e.g. created_date DESC."),
  limit: z.number().int().positive().optional().describe("Desired row count hint. The client enforces its own hard cap."),
});

/**
 * The only bridge between AI-SDK tool semantics and the pure lib/socrata
 * layer. Recoverable failures (bad column, malformed $where, Socrata 400s)
 * are returned as { success: false, error } so the AI SDK's built-in
 * multi-step loop feeds them back to the model as the next observation.
 * Unrecoverable failures (network down, timeout) are thrown so they surface
 * as a chat-level error instead.
 */
export const fetchSocrataDataTool = tool({
  description:
    "Query one of the supported NYC Open Data datasets via a SoQL query and render the results on the map. Replaces whatever layer is currently shown.",
  inputSchema,
  execute: async (params) => {
    const dataset = getDataset(params.datasetId);
    if (!dataset) {
      return {
        success: false as const,
        error: { kind: "validation" as const, message: `Unknown datasetId: ${params.datasetId}` },
      };
    }

    const url = buildSoqlUrl(dataset, params);

    try {
      const featureCollection = await fetchSocrata(dataset, url);

      if (featureCollection.features.length === 0) {
        return {
          success: false as const,
          error: { kind: "empty" as const, message: "Query returned zero results. Try loosening the filter." },
          datasetId: dataset.id,
        };
      }

      useMapLayersStore.getState().setActiveLayer({ datasetId: dataset.id, featureCollection });

      return {
        success: true as const,
        datasetId: dataset.id,
        where: params.where,
        featureCount: featureCollection.features.length,
        breadcrumb: `Current view: dataset=${dataset.id}, where=${params.where ?? "(none)"}, resultCount=${featureCollection.features.length}`,
      };
    } catch (err) {
      if (err instanceof SocrataHttpError) {
        return {
          success: false as const,
          error: { kind: "http" as const, message: `Socrata rejected the query (HTTP ${err.status}): ${err.body ?? err.message}` },
          datasetId: dataset.id,
        };
      }
      if (err instanceof TimeoutError) {
        throw err; // unrecoverable: surfaces as a chat-level error
      }
      throw err;
    }
  },
});

export const tools = {
  fetchSocrataData: fetchSocrataDataTool,
};
