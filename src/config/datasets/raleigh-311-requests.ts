import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "raleigh-311-requests",
  featureServerUrl: "https://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/Ask_Raleigh_Requests/FeatureServer/0",
  name: "Ask Raleigh Requests",
  description:
    "Raleigh's 311-equivalent: citizen-initiated service requests submitted through the Ask Raleigh Customer Experience Center, covering potholes, sidewalk damage, flooding, tree service, and other non-emergency city service issues.",
  mapColor: "#3d7a99",
  categoryField: "SERVICE",
  fields: [
    { name: "NUMBER", type: "esriFieldTypeString", description: "Unique identifier for the service request" },
    { name: "CATEGORY", type: "esriFieldTypeString", description: "Top-level service category, e.g. 'Transportation & Mobility', 'Stormwater & Water', 'Parks & Recreation'", facetable: true },
    {
      name: "SERVICE",
      type: "esriFieldTypeString",
      description: "Type of service requested, e.g. 'Potholes & Sinkholes', 'Tree Service', 'Flooding, Drainage, or Runoff', 'Sidewalk Issues'",
      facetable: true,
    },
    { name: "REQUEST_TYPE", type: "esriFieldTypeString", description: "More specific request type, e.g. 'Pothole', 'Flooding', 'Street sign' (often empty)" },
    { name: "STATUS", type: "esriFieldTypeString", description: "Current status of the request, one of: 'New', 'Work in Progress', 'Closed'", facetable: true },
    { name: "ADDRESS", type: "esriFieldTypeString", description: "Address where the service was requested" },
    { name: "ZIP_CODE", type: "esriFieldTypeString", description: "ZIP code where the service was requested" },
    { name: "APPLIED_DATE", type: "esriFieldTypeDate", description: "Date/time the request was submitted" },
    { name: "CLOSED_AT", type: "esriFieldTypeDate", description: "Date/time the request was closed" },
    { name: "RESOLVED_HOURS", type: "esriFieldTypeDouble", description: "Number of hours it took to resolve the request" },
  ],
  exemplars: [
    {
      question: "Pothole requests in Raleigh",
      query: { where: "SERVICE = 'Potholes & Sinkholes'" },
    },
    {
      question: "Requests under Transportation & Mobility in Raleigh",
      query: { where: "CATEGORY = 'Transportation & Mobility'" },
    },
    {
      question: "Open tree service requests in Raleigh",
      query: { where: "SERVICE = 'Tree Service' AND STATUS <> 'Closed'" },
    },
    {
      question: "Flooding and drainage requests in Raleigh so far in 2026",
      query: { where: "SERVICE = 'Flooding, Drainage, or Runoff' AND APPLIED_DATE > TIMESTAMP '2026-01-01 00:00:00'" },
    },
    {
      question: "Tree service requests near downtown Raleigh",
      query: {
        where: "SERVICE = 'Tree Service'",
        minLat: 35.7696,
        maxLat: 35.7896,
        minLon: -78.6482,
        maxLon: -78.6282,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
