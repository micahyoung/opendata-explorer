import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "baltimore-public-schools",
  featureServerUrl:
    "https://services1.arcgis.com/UWYHeuuJISiGmgXx/arcgis/rest/services/BCPSS_Schools_2025/FeatureServer/0",
  name: "Baltimore City Public Schools",
  description:
    "All Baltimore City Public Schools (BCPS) elementary, middle, high and charter schools. Does not include private schools.",
  mapColor: "#1b7a3d",
  categoryField: "CLASS",
  fields: [
    { name: "NAME", type: "esriFieldTypeString", description: "Name of the school" },
    { name: "ADDRESS", type: "esriFieldTypeString", description: "Street address of the school" },
    { name: "CLASS", type: "esriFieldTypeString", description: "Grade span, e.g. 'PK-5', '6-8', '9-12'", facetable: true },
    { name: "CATEGORY", type: "esriFieldTypeString", description: "School category: 'E' (elementary), 'M' (middle), 'H' (high school)", facetable: true },
    { name: "GRADES", type: "esriFieldTypeString", description: "Detailed grades served, e.g. 'PK-5'" },
    { name: "TYPE", type: "esriFieldTypeString", description: "School type, e.g. 'Traditional', 'Charter'", facetable: true },
    { name: "ZIPCODE", type: "esriFieldTypeString", description: "ZIP code of the school" },
  ],
  exemplars: [
    {
      question: "Elementary schools in Baltimore",
      query: { where: "CATEGORY = 'E'" },
    },
    {
      question: "High schools in Baltimore",
      query: { where: "CATEGORY = 'H'" },
    },
    {
      question: "Charter schools in Baltimore",
      query: { where: "TYPE = 'Charter'" },
    },
    {
      question: "Traditional middle schools in Baltimore",
      query: { where: "CATEGORY = 'M' AND TYPE = 'Traditional'" },
    },
    {
      question: "Schools near downtown Baltimore",
      query: {
        where: "1=1",
        minLat: 39.285,
        maxLat: 39.295,
        minLon: -76.62,
        maxLon: -76.605,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
