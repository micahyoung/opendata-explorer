import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "nashville-pini-schools",
  featureServerUrl:
    "https://services3.arcgis.com/pXGyp7DHTIE4RXOJ/arcgis/rest/services/Public_Infrastructure_Needs_Inventory_PINI_Schools/FeatureServer/0",
  name: "Nashville Public Infrastructure Needs Inventory — Schools",
  description:
    "Middle Tennessee Public Infrastructure Needs Inventory (PINI) of schools, including existing schools, planned new construction, renovations, and under-construction facilities across multiple counties.",
  mapColor: "#256d85",
  categoryField: "School_Status",
  fields: [
    { name: "School_Name", type: "esriFieldTypeString", description: "Name of the school" },
    { name: "School_Status", type: "esriFieldTypeString", description: "Status: 'EXISTING SCHOOL', 'NEW SCHOOL', 'RENNOVATION', 'UNDER CONSTRUCTION SCHOOL'", facetable: true },
    { name: "Address", type: "esriFieldTypeString", description: "Street address of the school" },
    { name: "City", type: "esriFieldTypeString", description: "City where the school is located", facetable: true },
    { name: "County", type: "esriFieldTypeString", description: "County name" },
    { name: "School_District", type: "esriFieldTypeString", description: "School district name", facetable: true },
    { name: "Grades_Served", type: "esriFieldTypeString", description: "Grades served, e.g. '9,10,11,12'" },
    { name: "Construction_Year", type: "esriFieldTypeInteger", description: "Year the school building was constructed" },
    { name: "ZIP_CODE", type: "esriFieldTypeInteger", description: "ZIP code" },
  ],
  exemplars: [
    {
      question: "Existing schools in the Nashville area",
      query: { where: "School_Status = 'EXISTING SCHOOL'" },
    },
    {
      question: "Planned new schools in Middle Tennessee",
      query: { where: "School_Status = 'NEW SCHOOL'" },
    },
    {
      question: "Schools built after 2000 in Nashville area",
      query: { where: "Construction_Year > 2000" },
    },
    {
      question: "Schools in Davidson County",
      query: { where: "County = 'Davidson '" },
    },
    {
      question: "Schools near downtown Nashville",
      query: {
        where: "1=1",
        minLat: 36.14,
        maxLat: 36.17,
        minLon: -86.81,
        maxLon: -86.77,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
