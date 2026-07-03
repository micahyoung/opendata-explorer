import { tool } from "ai";
import { z } from "zod";
import { datasetIds, getDataset } from "../../config/datasets";
import { useMapLayersStore } from "../mapState/mapLayersStore";
import { buildSoqlUrl } from "../socrata/buildSoqlUrl";
import { computeFacets, formatFacetSummary } from "../socrata/computeFacets";
import { fetchSocrata } from "../socrata/fetchSocrata";
import { fetchNominatim } from "../geocoding/fetchNominatim";
import { NominatimHttpError, SocrataHttpError, TimeoutError } from "../utils/errors";

const geocodeInputSchema = z.object({
  query: z
    .string()
    .describe(
      "A free-text place description to geocode, e.g. '34th Avenue and 72nd Street, Queens, NY' or a landmark name. Include borough/city context when known."
    ),
});

/**
 * Resolves a named place to real coordinates via the public Nominatim
 * (OpenStreetMap) API, so the model isn't left guessing lat/lon literals
 * from trained-in geography knowledge. Soft-fails (notFound) are returned
 * so the model sees them as an observation; network/timeout failures are
 * thrown, matching fetchSocrataDataTool's convention.
 */
export const geocodeLocationTool = tool({
  description:
    "Resolve a named address, intersection, or landmark to a lat/lon bounding box. Call this before fetchSocrataData when the user names a specific place that isn't already expressible as a categorical field value (borough, ZIP, etc.).",
  inputSchema: geocodeInputSchema,
  execute: async (params) => {
    try {
      return await fetchNominatim(params.query);
    } catch (err) {
      if (err instanceof NominatimHttpError) {
        return {
          success: false as const,
          query: params.query,
          error: { kind: "http" as const, message: `Nominatim rejected the request (HTTP ${err.status}): ${err.body ?? err.message}` },
        };
      }
      if (err instanceof TimeoutError) {
        throw err; // unrecoverable: surfaces as a chat-level error
      }
      throw err;
    }
  },
});

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

      const facets = computeFacets(dataset, featureCollection);
      const facetSummary = formatFacetSummary(facets);

      return {
        success: true as const,
        datasetId: dataset.id,
        where: params.where,
        featureCount: featureCollection.features.length,
        facets,
        breadcrumb: `Current view: dataset=${dataset.id}, where=${params.where ?? "(none)"}, resultCount=${featureCollection.features.length}${facetSummary ? `. Field breakdown — ${facetSummary}` : ""}`,
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
  geocodeLocation: geocodeLocationTool,
  fetchSocrataData: fetchSocrataDataTool,
};
