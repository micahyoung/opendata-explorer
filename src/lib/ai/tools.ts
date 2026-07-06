import { tool } from "ai";
import { z } from "zod";
import { BACKEND_SYNTAX_GUIDE, datasetIds, getDataset } from "../../config/datasets";
import { useCredentials } from "../credentials/useCredentials";
import { useMapLayersStore } from "../mapState/mapLayersStore";
import { buildArcgisUrl } from "../arcgis/buildArcgisUrl";
import { fetchArcgis } from "../arcgis/fetchArcgis";
import { buildSoqlUrl } from "../socrata/buildSoqlUrl";
import { computeFacets, formatFacetSummary } from "../socrata/computeFacets";
import { fetchSocrata } from "../socrata/fetchSocrata";
import { fetchNominatim } from "../geocoding/fetchNominatim";
import { ArcgisHttpError, NominatimHttpError, SocrataHttpError, TimeoutError } from "../utils/errors";
import { listResultSetsTool, readResultRowsTool } from "./resultSetTools";

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

const datasetDetailsInputSchema = z.object({
  datasetIds: z
    .array(z.enum(datasetIds))
    .min(1)
    .describe("One or more dataset IDs to fetch field lists and example queries for. Pass multiple when comparing datasets."),
});

/**
 * Delivers the field schema + worked SoQL exemplars for specific datasets on
 * demand, instead of injecting every dataset's full schema into the system
 * prompt on every turn. Pure lookup against static config — no network call,
 * no map/store side effects.
 */
export const getDatasetDetailsTool = tool({
  description:
    "Fetch the field list, example queries, and query-syntax guide for one or more datasets. Call this before querying any dataset you haven't already seen the details of this conversation — its response tells you which fetch tool to call and the exact query syntax that dataset's backend expects.",
  inputSchema: datasetDetailsInputSchema,
  execute: async (params) => {
    return params.datasetIds.map((id) => {
      const dataset = getDataset(id);
      if (!dataset) {
        return {
          datasetId: id,
          success: false as const,
          error: { kind: "validation" as const, message: `Unknown datasetId: ${id}` },
        };
      }
      return {
        datasetId: dataset.id,
        success: true as const,
        fields: dataset.fields,
        exemplars: dataset.exemplars,
        syntaxGuide: BACKEND_SYNTAX_GUIDE[dataset.backend],
      };
    });
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
    "Query one of the supported Open Data datasets via a SoQL query and render the results on the map. Replaces whatever layer is currently shown.",
  inputSchema,
  execute: async (params, { toolCallId }) => {
    const dataset = getDataset(params.datasetId);
    if (!dataset || dataset.backend !== "socrata") {
      return {
        success: false as const,
        error: { kind: "validation" as const, message: `Unknown or non-Socrata datasetId: ${params.datasetId}` },
      };
    }

    const appToken = useCredentials.getState().credentials?.socrataAppTokens?.[dataset.domain];
    const url = buildSoqlUrl(dataset, params, appToken);

    try {
      const featureCollection = await fetchSocrata(dataset, url);

      if (featureCollection.features.length === 0) {
        return {
          success: false as const,
          error: {
            kind: "empty" as const,
            message:
              "Query returned zero results. Reconsider whether the filter targets the right field, value, or spelling — not just the geographic bounds.",
          },
          datasetId: dataset.id,
        };
      }

      const facets = computeFacets(dataset, featureCollection);
      const facetSummary = formatFacetSummary(facets);

      useMapLayersStore.getState().addLayer({
        id: toolCallId,
        datasetId: dataset.id,
        where: params.where,
        featureCollection,
        summary: facetSummary,
      });

      return {
        success: true as const,
        datasetId: dataset.id,
        where: params.where,
        featureCount: featureCollection.features.length,
        facets,
        resultSetId: toolCallId,
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

const arcgisInputSchema = z.object({
  datasetId: z.enum(datasetIds).describe("The ArcGIS-backed dataset ID to query. Must be one of the supported datasets."),
  where: z.string().optional().describe("An Esri SQL-92-style where clause body, e.g. BORO = 'K'."),
  outFields: z.string().optional().describe("Comma-separated outFields column list. Omit or use '*' to select all columns."),
  orderByFields: z.string().optional().describe("A raw orderByFields clause, e.g. SCHOOLNAME ASC."),
  resultRecordCount: z.number().int().positive().optional().describe("Desired row count hint. The client enforces its own hard cap."),
  minLat: z
    .number()
    .optional()
    .describe(
      "Minimum latitude of a bounding box to spatially constrain results — pass geocodeLocation's boundingBox.minLat directly. Must be given together with maxLat, minLon, and maxLon."
    ),
  maxLat: z.number().optional().describe("Maximum latitude of the bounding box — geocodeLocation's boundingBox.maxLat."),
  minLon: z.number().optional().describe("Minimum longitude of the bounding box — geocodeLocation's boundingBox.minLon."),
  maxLon: z.number().optional().describe("Maximum longitude of the bounding box — geocodeLocation's boundingBox.maxLon."),
});

/**
 * The ArcGIS counterpart to fetchSocrataDataTool. No app-token lookup is
 * needed — the supported ArcGIS Hub FeatureServers are public with open CORS.
 */
export const fetchArcGisDataTool = tool({
  description:
    "Query one of the supported ArcGIS-backed Open Data datasets via an Esri REST query and render the results on the map. Replaces whatever layer is currently shown.",
  inputSchema: arcgisInputSchema,
  execute: async (params, { toolCallId }) => {
    const dataset = getDataset(params.datasetId);
    if (!dataset || dataset.backend !== "arcgis") {
      return {
        success: false as const,
        error: { kind: "validation" as const, message: `Unknown or non-ArcGIS datasetId: ${params.datasetId}` },
      };
    }

    const bboxFields = [params.minLat, params.maxLat, params.minLon, params.maxLon];
    const bboxFieldsProvided = bboxFields.filter((field) => field !== undefined).length;
    if (bboxFieldsProvided !== 0 && bboxFieldsProvided !== 4) {
      return {
        success: false as const,
        error: { kind: "validation" as const, message: "minLat, maxLat, minLon, and maxLon must all be provided together, or all omitted." },
        datasetId: dataset.id,
      };
    }

    const url = buildArcgisUrl(dataset, params);

    try {
      const featureCollection = await fetchArcgis(url);

      if (featureCollection.features.length === 0) {
        return {
          success: false as const,
          error: {
            kind: "empty" as const,
            message:
              "Query returned zero results. Reconsider whether the filter targets the right field, value, or spelling — not just the geographic bounds.",
          },
          datasetId: dataset.id,
        };
      }

      const facets = computeFacets(dataset, featureCollection);
      const facetSummary = formatFacetSummary(facets);

      useMapLayersStore.getState().addLayer({
        id: toolCallId,
        datasetId: dataset.id,
        where: params.where,
        featureCollection,
        summary: facetSummary,
      });

      return {
        success: true as const,
        datasetId: dataset.id,
        where: params.where,
        featureCount: featureCollection.features.length,
        facets,
        resultSetId: toolCallId,
      };
    } catch (err) {
      if (err instanceof ArcgisHttpError) {
        return {
          success: false as const,
          error: { kind: "http" as const, message: `ArcGIS rejected the query (HTTP ${err.status}): ${err.body ?? err.message}` },
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
  getDatasetDetails: getDatasetDetailsTool,
  fetchSocrataData: fetchSocrataDataTool,
  fetchArcGisData: fetchArcGisDataTool,
  listResultSets: listResultSetsTool,
  readResultRows: readResultRowsTool,
};
