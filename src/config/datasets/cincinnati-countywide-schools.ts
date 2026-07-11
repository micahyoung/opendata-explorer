import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "cincinnati-countywide-schools",
  featureServerUrl:
    "https://services.arcgis.com/JyZag7oO4NteHGiq/arcgis/rest/services/Open_Data/FeatureServer/24",
  name: "Cincinnati Countywide School Locations",
  description:
    "Countywide public and private school locations across Cincinnati and Hamilton County, including school type, district, and grade information.",
  mapColor: "#52b788",
  categoryField: "TYPE",
  fields: [
    { name: "SCHOOL", type: "esriFieldTypeString", description: "Name of the school" },
    { name: "ADDRESS", type: "esriFieldTypeString", description: "Street address of the school" },
    { name: "TYPE", type: "esriFieldTypeString", description: "School type, e.g. 'Elementary School', 'Middle School', 'High School', 'K-12 School'", facetable: true },
    { name: "GRADE", type: "esriFieldTypeString", description: "Grades served, e.g. 'K-6', '7-8', '9-12'" },
    { name: "FUND", type: "esriFieldTypeString", description: "Funding type: 'Public' or 'Private'", facetable: true },
    { name: "DIST_NAME", type: "esriFieldTypeString", description: "School district name, e.g. 'Cincinnati Public Schools'", facetable: true },
    { name: "CITY_STATE", type: "esriFieldTypeString", description: "City where the school is located" },
  ],
  exemplars: [
    {
      question: "Elementary schools in Cincinnati",
      query: { where: "TYPE = 'Elementary School'" },
    },
    {
      question: "Public high schools in Cincinnati area",
      query: { where: "TYPE = 'High School' AND FUND = 'Public'" },
    },
    {
      question: "Cincinnati Public Schools district schools",
      query: { where: "DIST_NAME = 'Cincinnati Public Schools'" },
    },
    {
      question: "Private schools in Cincinnati area",
      query: { where: "FUND = 'Private'" },
    },
    {
      question: "Schools near downtown Cincinnati",
      query: {
        where: "1=1",
        minLat: 39.11,
        maxLat: 39.13,
        minLon: -84.52,
        maxLon: -84.49,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
