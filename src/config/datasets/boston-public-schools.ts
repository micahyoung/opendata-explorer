import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "boston-public-schools",
  featureServerUrl:
    "https://services.arcgis.com/sFnw0xNflSi8J0uh/arcgis/rest/services/Schools_Public_2026_0204/FeatureServer/0",
  name: "Boston Public Schools",
  description:
    "Locations of Boston Public Schools (BPS) campuses, including elementary, middle, and high schools across Boston neighborhoods. Published by the Boston Planning & Development Agency.",
  mapColor: "#c45a33",
  categoryField: "TYPE",
  fields: [
    { name: "FID", type: "esriFieldTypeOID", description: "Unique feature ID" },
    { name: "NAME", type: "esriFieldTypeString", description: "School name, e.g. 'Adams, Samuel Elementary'" },
    { name: "ADDRESS", type: "esriFieldTypeString", description: "Street address of the school" },
    {
      name: "COMMUNITY",
      type: "esriFieldTypeString",
      description: "Boston neighborhood, e.g. 'East Boston', 'Roxbury', 'Dorchester', 'Jamaica Plain'",
      facetable: true,
    },
    { name: "CITY", type: "esriFieldTypeString", description: 'City name (always "Boston")' },
    { name: "STATE", type: "esriFieldTypeString", description: 'State abbreviation (always "MA")' },
    { name: "ZIP", type: "esriFieldTypeString", description: "ZIP code of the school" },
    {
      name: "TYPE",
      type: "esriFieldTypeString",
      description: "Grade range served, e.g. 'K-6', '9-12', '6-8', 'ES' (elementary school)",
      facetable: true,
    },
  ],
  exemplars: [
    {
      question: "Elementary schools in Boston",
      query: { where: "TYPE = 'K-6' OR TYPE = 'ES'" },
    },
    {
      question: "High schools in Boston",
      query: { where: "TYPE like '%12' OR TYPE like '9-%'" },
    },
    {
      question: "BPS schools in Roxbury",
      query: { where: "COMMUNITY = 'Roxbury'" },
    },
    {
      question: "BPS schools in Dorchester",
      query: { where: "COMMUNITY = 'Dorchester'" },
    },
    {
      question: "BPS schools near downtown Boston",
      query: {
        where: "1=1",
        minLat: 42.345,
        maxLat: 42.36,
        minLon: -71.07,
        maxLon: -71.05,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
