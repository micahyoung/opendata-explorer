import { tool } from "ai";
import type { Point } from "geojson";
import { z } from "zod";
import { DEFAULT_ROW_READ_LIMIT, MAX_ROW_READ_LIMIT } from "../../config/constants";
import { getDataset } from "../../config/datasets";
import { coordinateKey } from "../mapState/geo";
import { useMapLayersStore } from "../mapState/mapLayersStore";
import { usePinnedPointsStore } from "../mapState/pinnedPointsStore";
import { featureToRow, formatFieldsInline, pickCsvColumns, toCSV } from "../utils/exportRows";

export const listResultSetsTool = tool({
  description:
    "List past query result sets from this conversation (from earlier fetchSocrataData calls): dataset, filter, row count, and when fetched. Call this before readPastResults to find a resultSetId.",
  inputSchema: z.object({}),
  execute: async () => {
    const { entries, order } = useMapLayersStore.getState();
    return {
      success: true as const,
      resultSets: order.map((id) => {
        const e = entries.get(id)!;
        return {
          resultSetId: e.id,
          datasetId: e.datasetId,
          where: e.where,
          featureCount: e.featureCollection.features.length,
          createdAt: e.createdAt,
          summary: e.summary,
        };
      }),
    };
  },
});

const readPastResultsInputSchema = z.object({
  resultSetId: z.string().describe("A resultSetId from listResultSets or the current fetchSocrataData call."),
  offset: z.number().int().nonnegative().optional().default(0),
  limit: z.number().int().positive().max(MAX_ROW_READ_LIMIT).optional().default(DEFAULT_ROW_READ_LIMIT),
  columns: z.array(z.string()).optional().describe("Subset of field names to include; omit for the dataset's full field list."),
});

export const readPastResultsTool = tool({
  description:
    "Read raw row data (CSV, paginated) from a specific past result set (by resultSetId). Use for specific records/values beyond the facet breakdown, not to re-derive a distribution facets already cover. For on-screen data instead, use readActiveResults.",
  inputSchema: readPastResultsInputSchema,
  execute: async (params) => {
    const entry = useMapLayersStore.getState().entries.get(params.resultSetId);
    if (!entry) {
      return {
        success: false as const,
        error: {
          kind: "notFound" as const,
          message: `resultSetId "${params.resultSetId}" not found — it may have been evicted. Call listResultSets for currently available IDs.`,
        },
      };
    }

    const dataset = getDataset(entry.datasetId)!;
    const limit = Math.min(params.limit ?? DEFAULT_ROW_READ_LIMIT, MAX_ROW_READ_LIMIT);
    const offset = params.offset ?? 0;
    const allColumns = pickCsvColumns(dataset);
    const columns = params.columns?.length
      ? params.columns.filter((c) => allColumns.includes(c) || c === "lat" || c === "lon")
      : allColumns;
    const slice = entry.featureCollection.features.slice(offset, offset + limit);

    return {
      success: true as const,
      resultSetId: params.resultSetId,
      datasetId: dataset.id,
      offset,
      returned: slice.length,
      totalFeatureCount: entry.featureCollection.features.length,
      csv: toCSV(
        slice.map((f) => featureToRow(f, columns)),
        columns
      ),
    };
  },
});

const readActiveResultsInputSchema = z.object({
  filter: z
    .enum(["visible", "selected"])
    .optional()
    .default("visible")
    .describe(
      '"visible": points currently on-screen in the map viewport, across every past query still rendered. "selected": points the user has pinned by clicking, regardless of current pan/zoom.'
    ),
  offset: z.number().int().nonnegative().optional().default(0),
  limit: z.number().int().positive().max(MAX_ROW_READ_LIMIT).optional().default(DEFAULT_ROW_READ_LIMIT),
});

const ACTIVE_RESULTS_COLUMNS = ["resultSetId", "datasetId", "pinned", "fields"];

interface ActiveResultRow {
  resultSetId: string;
  datasetId: string;
  lat: number;
  lon: number;
  pinned: boolean;
  fields: string;
}

function toRow(row: ActiveResultRow): Record<string, unknown> {
  return { ...row };
}

export const readActiveResultsTool = tool({
  description:
    'Read points currently active on the map, without needing a resultSetId. filter: "visible" (default) returns points in the current map viewport across every past query still rendered; filter: "selected" returns points the user has pinned by clicking, regardless of viewport. Use this instead of readPastResults for "what am I looking at" / "what did I select" questions.',
  inputSchema: readActiveResultsInputSchema,
  execute: async (params) => {
    const offset = params.offset ?? 0;
    const limit = Math.min(params.limit ?? DEFAULT_ROW_READ_LIMIT, MAX_ROW_READ_LIMIT);
    const pins = usePinnedPointsStore.getState().pins;

    if (params.filter === "selected") {
      const rows: ActiveResultRow[] = [...pins.values()].map((pin) => ({
        resultSetId: pin.resultSetId,
        datasetId: pin.datasetId,
        lat: pin.latitude,
        lon: pin.longitude,
        pinned: true,
        fields: formatFieldsInline(pin.properties),
      }));
      const slice = rows.slice(offset, offset + limit);
      return {
        success: true as const,
        filter: "selected" as const,
        offset,
        returned: slice.length,
        totalSelectedCount: rows.length,
        csv: toCSV(slice.map(toRow), ACTIVE_RESULTS_COLUMNS),
      };
    }

    const { entries, order, mapInstance } = useMapLayersStore.getState();
    if (!mapInstance) {
      return {
        success: false as const,
        error: {
          kind: "mapNotReady" as const,
          message: "The map hasn't finished loading yet, so its current viewport can't be read. Try again shortly, or use filter: \"selected\" for pinned points.",
        },
      };
    }

    const bounds = mapInstance.getBounds();
    const rows: ActiveResultRow[] = [];
    for (const id of order) {
      const entry = entries.get(id);
      if (!entry) continue;
      for (const feature of entry.featureCollection.features) {
        if (feature.geometry?.type !== "Point") continue;
        const [lon, lat] = (feature.geometry as Point).coordinates;
        if (!bounds.contains([lon, lat])) continue;
        rows.push({
          resultSetId: entry.id,
          datasetId: entry.datasetId,
          lat,
          lon,
          pinned: pins.has(coordinateKey(lon, lat)),
          fields: formatFieldsInline(feature.properties),
        });
      }
    }

    const slice = rows.slice(offset, offset + limit);
    return {
      success: true as const,
      filter: "visible" as const,
      offset,
      returned: slice.length,
      totalVisibleCount: rows.length,
      csv: toCSV(slice.map(toRow), ACTIVE_RESULTS_COLUMNS),
    };
  },
});
