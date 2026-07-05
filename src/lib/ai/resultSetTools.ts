import { tool } from "ai";
import { z } from "zod";
import { DEFAULT_ROW_READ_LIMIT, MAX_ROW_READ_LIMIT } from "../../config/constants";
import { getDataset } from "../../config/datasets";
import { useMapLayersStore } from "../mapState/mapLayersStore";
import { featureToRow, pickCsvColumns, toCSV } from "../utils/exportRows";

export const listResultSetsTool = tool({
  description:
    "List past query result sets from this conversation (from earlier fetchSocrataData calls): dataset, filter, row count, and when fetched. Call this before readResultRows to find a resultSetId.",
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

const readResultRowsInputSchema = z.object({
  resultSetId: z.string().describe("A resultSetId from listResultSets or the current fetchSocrataData call."),
  offset: z.number().int().nonnegative().optional().default(0),
  limit: z.number().int().positive().max(MAX_ROW_READ_LIMIT).optional().default(DEFAULT_ROW_READ_LIMIT),
  columns: z.array(z.string()).optional().describe("Subset of field names to include; omit for the dataset's full field list."),
});

export const readResultRowsTool = tool({
  description:
    "Read raw row data (CSV, paginated) from a result set. Use for specific records/values beyond the facet breakdown, not to re-derive a distribution facets already cover.",
  inputSchema: readResultRowsInputSchema,
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
