import { z } from "zod";
import { datasetIds } from "../../config/datasets";
import type { ArcgisQueryParams } from "../../types/arcgisTool";

const queryParamsSchema = z.object({
  datasetId: z.enum(datasetIds),
  where: z.string().optional(),
  outFields: z.string().optional(),
  orderByFields: z.string().optional(),
  resultRecordCount: z.number().int().positive().optional(),
});

export function validateQueryParams(input: unknown): ArcgisQueryParams {
  return queryParamsSchema.parse(input);
}
