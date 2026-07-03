import { z } from "zod";

export const datasetFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string(),
  facetable: z.boolean().optional(),
});
export type DatasetField = z.infer<typeof datasetFieldSchema>;

export const soqlExemplarSchema = z.object({
  question: z.string(),
  soql: z.object({
    select: z.string().optional(),
    where: z.string().optional(),
    order: z.string().optional(),
    limit: z.number().int().positive().optional(),
  }),
});
export type SoqlExemplar = z.infer<typeof soqlExemplarSchema>;

/**
 * Not every Socrata dataset exposes a native `location`-typed column that the
 * `.geojson` endpoint can render directly (e.g. the tree census only has
 * separate latitude/longitude text columns). `mode` records which strategy
 * the fetch layer must use to end up with a FeatureCollection.
 */
export const geoConfigSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("native"), field: z.string() }),
  z.object({ mode: z.literal("latlon"), latField: z.string(), lonField: z.string() }),
]);
export type GeoConfig = z.infer<typeof geoConfigSchema>;

export const datasetDefinitionSchema = z
  .object({
    id: z.string().describe("Socrata dataset (resource) ID, e.g. erm2-nwe9"),
    domain: z.string().describe("Socrata portal domain hosting this dataset, e.g. data.cityofnewyork.us"),
    name: z.string(),
    description: z.string(),
    geo: geoConfigSchema,
    fields: z.array(datasetFieldSchema),
    exemplars: z.array(soqlExemplarSchema).min(1),
    mapColor: z.string().describe("Accent color for this dataset's map dots and UI chrome"),
    categoryField: z.string().describe("Field name whose values drive categorical map coloring + legend"),
  })
  .superRefine((dataset, ctx) => {
    if (!dataset.fields.some((f) => f.name === dataset.categoryField)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `categoryField "${dataset.categoryField}" does not match any declared field name`,
        path: ["categoryField"],
      });
    }
  });
export type DatasetDefinition = z.infer<typeof datasetDefinitionSchema>;
