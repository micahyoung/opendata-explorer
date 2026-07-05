import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "nyc-public-schools",
  featureServerUrl: "https://services8.arcgis.com/GtCgC2CEYrr1uOjs/arcgis/rest/services/Public_School_Locations/FeatureServer/0",
  name: "NYC Public School Locations",
  description:
    "Locations of NYC public schools, including borough, school type (Elementary/Middle/High), grades served, and address.",
  mapColor: "#2f7d5e",
  categoryField: "SCH_TYPE",
  fields: [
    { name: "FID", type: "esriFieldTypeOID", description: "Unique feature ID" },
    { name: "ATS_CODE", type: "esriFieldTypeString", description: "NYC DOE school ATS code" },
    { name: "BORO", type: "esriFieldTypeString", description: "Borough code, one of: M (Manhattan), X (Bronx), K (Brooklyn), Q (Queens), R (Staten Island)", facetable: true },
    { name: "LOC_CODE", type: "esriFieldTypeString", description: "DOE location code" },
    { name: "SCHOOLNAME", type: "esriFieldTypeString", description: "School name" },
    { name: "SCH_TYPE", type: "esriFieldTypeString", description: "School type, e.g. 'Elementary', 'Middle', 'High School'", facetable: true },
    { name: "GEO_DISTRI", type: "esriFieldTypeString", description: "Geographic school district number" },
    { name: "ADDRESS", type: "esriFieldTypeString", description: "Street address" },
    { name: "ZIP", type: "esriFieldTypeString", description: "ZIP code" },
    { name: "PRINCIPAL", type: "esriFieldTypeString", description: "Principal's name" },
    { name: "GRADES", type: "esriFieldTypeString", description: "Grade range served, e.g. 'K-5'" },
    { name: "City", type: "esriFieldTypeString", description: "City name" },
  ],
  exemplars: [
    {
      question: "Elementary schools in Brooklyn",
      query: { where: "SCH_TYPE = 'Elementary' AND BORO = 'K'" },
    },
    {
      question: "High schools in the Bronx",
      query: { where: "SCH_TYPE = 'High School' AND BORO = 'X'" },
    },
    {
      question: "All public schools in Manhattan",
      query: { where: "BORO = 'M'" },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
