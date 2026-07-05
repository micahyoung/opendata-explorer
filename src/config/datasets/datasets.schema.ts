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

export const arcgisExemplarSchema = z.object({
  question: z.string(),
  query: z.object({
    where: z.string().optional(),
    outFields: z.string().optional(),
    orderByFields: z.string().optional(),
    resultRecordCount: z.number().int().positive().optional(),
    minLat: z.number().optional(),
    maxLat: z.number().optional(),
    minLon: z.number().optional(),
    maxLon: z.number().optional(),
  }),
});
export type ArcgisExemplar = z.infer<typeof arcgisExemplarSchema>;

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

const baseDatasetShape = {
  id: z.string(),
  name: z.string(),
  description: z.string(),
  fields: z.array(datasetFieldSchema),
  mapColor: z.string().describe("Accent color for this dataset's map dots and UI chrome"),
  categoryField: z.string().describe("Field name whose values drive categorical map coloring + legend"),
};

function requireCategoryField<T extends { fields: { name: string }[]; categoryField: string }>(
  dataset: T,
  ctx: z.RefinementCtx
) {
  if (!dataset.fields.some((f) => f.name === dataset.categoryField)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `categoryField "${dataset.categoryField}" does not match any declared field name`,
      path: ["categoryField"],
    });
  }
}

const socrataDatasetSchema = z
  .object({
    backend: z.literal("socrata"),
    ...baseDatasetShape,
    id: z.string().describe("Socrata dataset (resource) ID, e.g. erm2-nwe9"),
    domain: z.string().describe("Socrata portal domain hosting this dataset, e.g. data.cityofnewyork.us"),
    geo: geoConfigSchema,
    exemplars: z.array(soqlExemplarSchema).min(1),
  })
  .superRefine(requireCategoryField);

const arcgisDatasetSchema = z
  .object({
    backend: z.literal("arcgis"),
    ...baseDatasetShape,
    featureServerUrl: z.string().describe("Base ArcGIS FeatureServer layer URL, e.g. .../FeatureServer/0"),
    exemplars: z.array(arcgisExemplarSchema).min(1),
  })
  .superRefine(requireCategoryField);

export const datasetDefinitionSchema = z.discriminatedUnion("backend", [socrataDatasetSchema, arcgisDatasetSchema]);
export type DatasetDefinition = z.infer<typeof datasetDefinitionSchema>;
export type SocrataDatasetDefinition = z.infer<typeof socrataDatasetSchema>;
export type ArcgisDatasetDefinition = z.infer<typeof arcgisDatasetSchema>;

export const BACKEND_SYNTAX_GUIDE: Record<"socrata" | "arcgis", string> = {
  socrata:
    'Call fetchSocrataData. Write "where" as a raw SoQL $where clause body (no leading "WHERE"), e.g. borough = \'QUEENS\' AND complaint_type like \'%Noise%\'. String comparisons in SoQL are case-sensitive; match the casing style shown in the field descriptions and exemplars. Use "select" for a comma-separated column list (omit for all columns), and "order" for a raw SoQL $order clause.',
  arcgis:
    'Call fetchArcGisData. Write "where" as an Esri SQL-92-style clause (no leading "WHERE"), e.g. SCH_TYPE = \'Elementary\' AND BORO = \'K\'. To constrain results to a named place, call geocodeLocation first and pass its boundingBox.minLat/maxLat/minLon/maxLon straight through as the matching minLat/maxLat/minLon/maxLon params (all four together, or omit all four) — this applies an Esri envelope spatial filter ANDed with "where", so combine it with a categorical where clause for extra precision when a matching field exists (e.g. borough). Use "outFields" as a comma-separated column list (omit or use "*" for all columns), and "resultRecordCount" for a row-count hint. Results are always returned as WGS84 GeoJSON, so no coordinate-system handling is needed.',
};
