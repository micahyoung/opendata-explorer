import { z } from "zod";
import { datasetIds } from "../../config/datasets";
import type { SocrataQueryParams } from "../../types/socrataTool";

const queryParamsSchema = z.object({
  datasetId: z.enum(datasetIds),
  select: z.string().optional(),
  where: z.string().optional(),
  order: z.string().optional(),
  limit: z.number().int().positive().optional(),
});

export function validateQueryParams(input: unknown): SocrataQueryParams {
  return queryParamsSchema.parse(input);
}
