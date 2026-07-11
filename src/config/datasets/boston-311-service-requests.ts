import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "ckan",
  id: "boston-311-service-requests",
  portalUrl: "https://data.boston.gov",
  resourceId: "254adca6-64ab-4c5c-9fc0-a6da622be185",
  name: "Boston 311 Service Requests",
  description:
    "Boston 311 service requests from the current system. Non-emergency requests made by residents to city agencies, including type, status, and location.",
  geo: { mode: "latlon", latField: "latitude", lonField: "longitude" },
  mapColor: "#1f6f5c",
  categoryField: "case_topic",
  fields: [
    { name: "case_id", type: "text", description: "Unique identifier for the request" },
    { name: "open_date", type: "text", description: "Date/time the request was opened" },
    { name: "close_date", type: "text", description: "Date/time the request was closed" },
    { name: "case_status", type: "text", description: "Status of the request, e.g. 'In progress', 'Closed', 'Apply', 'Create', 'Submit', 'Error', 'Needs Reallocation'", facetable: true },
    { name: "case_topic", type: "text", description: "High-level request category, e.g. 'Street Light Outage', 'Fallen Tree or Branches'", facetable: true },
    { name: "service_name", type: "text", description: "Specific service requested" },
    { name: "closure_reason", type: "text", description: "Reason the case was closed" },
    { name: "assigned_department", type: "text", description: "City department responsible for the request, e.g. 'Public Works Department (PWD)'", facetable: true },
    { name: "report_source", type: "text", description: "How the request was submitted, e.g. 'BOS311', 'Call'", facetable: true },
    { name: "neighborhood", type: "text", description: "Boston neighborhood of the request", facetable: true },
    { name: "full_address", type: "text", description: "Street address of the request" },
    { name: "latitude", type: "text", description: "Latitude of the request location" },
    { name: "longitude", type: "text", description: "Longitude of the request location" },
  ],
  exemplars: [
    {
      question: "Show me in-progress 311 requests in Jamaica Plain",
      query: { filters: { case_status: "In progress", neighborhood: "Jamaica Plain" }, limit: 1000 },
    },
    {
      question: "Street light outages in Boston",
      query: { filters: { case_topic: "Street Light Outage" }, sort: "open_date desc", limit: 1000 },
    },
    {
      question: "Fallen trees or branches reported recently",
      query: { filters: { case_topic: "Fallen Tree or Branches" }, sort: "open_date desc", limit: 1000 },
    },
    {
      question: "311 requests handled by the Public Works Department",
      query: { filters: { assigned_department: "Public Works Department (PWD)" }, limit: 1000 },
    },
    {
      question: "Requests mentioning graffiti",
      query: { q: "graffiti", limit: 1000 },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
