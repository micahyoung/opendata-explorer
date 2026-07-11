import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "seattle-public-schools",
  featureServerUrl:
    "https://services2.arcgis.com/I7NQBinfvOmxQbXs/arcgis/rest/services/vw_schools_2023/FeatureServer/0",
  name: "Seattle Public Schools Sites",
  description:
    "Locations of Seattle Public Schools (SPS) campuses with school name, level, grades served, address, and latitude/longitude for the 2023-2024 school year.",
  mapColor: "#2f6f99",
  categoryField: "esmshs",
  fields: [
    { name: "school_name", type: "esriFieldTypeString", description: "Name of the school" },
    { name: "mapLabel", type: "esriFieldTypeString", description: "Map display label (shortened name)" },
    { name: "esmshs", type: "esriFieldTypeString", description: "School level: 'ES' (Elementary), 'MS' (Middle), 'HS' (High School), 'MSHS' (Combined Middle/High)", facetable: true },
    { name: "grades", type: "esriFieldTypeString", description: "Grade range served, e.g. 'K-5', '6-8', '9-12'" },
    { name: "status", type: "esriFieldTypeString", description: "School status, e.g. 'ELEM', 'MS', 'HS', 'Option ELEM'", facetable: true },
    { name: "address", type: "esriFieldTypeString", description: "Street address of the school" },
    { name: "zip", type: "esriFieldTypeInteger", description: "ZIP code of the school" },
    { name: "Latitude", type: "esriFieldTypeDouble", description: "Latitude of the school" },
    { name: "Longitude", type: "esriFieldTypeDouble", description: "Longitude of the school" },
  ],
  exemplars: [
    {
      question: "Elementary schools in Seattle",
      query: { where: "esmshs = 'ES'" },
    },
    {
      question: "Middle schools in Seattle",
      query: { where: "esmshs = 'MS'" },
    },
    {
      question: "High schools in Seattle",
      query: { where: "esmshs = 'HS'" },
    },
    {
      question: "K-8 schools in Seattle",
      query: { where: "grades = 'K-8'" },
    },
    {
      question: "Schools in downtown Seattle",
      query: {
        where: "1=1",
        minLat: 47.595,
        maxLat: 47.625,
        minLon: -122.340,
        maxLon: -122.310,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
