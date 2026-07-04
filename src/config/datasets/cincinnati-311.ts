import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  id: "gcej-gmiw",
  domain: "data.cincinnati-oh.gov",
  name: "Cincinnati 311 (Non-Emergency) Service Requests",
  description:
    "Cincinnati 311 service requests, including trash/bulky item collection, code enforcement, potholes, and other non-emergency requests, with type, status, and location.",
  geo: { mode: "latlon", latField: "latitude", lonField: "longitude" },
  mapColor: "#7a3ea1",
  categoryField: "sr_type_desc",
  fields: [
    { name: "sr_number", type: "text", description: "Unique identifier for the service request" },
    { name: "date_created", type: "floating_timestamp", description: "Date/time the request was created" },
    { name: "date_closed", type: "floating_timestamp", description: "Date the request was closed" },
    { name: "sr_status", type: "text", description: "Status code of the request, e.g. 'NEW', 'CLOSD'", facetable: true },
    { name: "sr_status_flag", type: "text", description: "High-level status, one of: OPEN, CLOSED", facetable: true },
    {
      name: "sr_type_desc",
      type: "text",
      description:
        "Request type description, e.g. 'METAL FURNITURE, SPEC COLLECTN', 'POTHOLE, REPAIR', 'TALL GRASS/WEEDS, PRIVATE PROP'. All-caps, abbreviated.",
      facetable: true,
    },
    { name: "neighborhood", type: "text", description: "Neighborhood of the request location", facetable: true },
    { name: "address", type: "text", description: "Street address of the request" },
    { name: "latitude", type: "number", description: "Latitude of the request location" },
    { name: "longitude", type: "number", description: "Longitude of the request location" },
  ],
  exemplars: [
    {
      question: "Pothole repair requests in Cincinnati",
      soql: {
        where: "sr_type_desc = 'POTHOLE, REPAIR'",
        order: "date_created DESC",
        limit: 1000,
      },
    },
    {
      question: "Open service requests in Northside",
      soql: {
        where: "sr_status_flag = 'OPEN' AND neighborhood = 'NORTHSIDE'",
        order: "date_created DESC",
        limit: 1000,
      },
    },
    {
      question: "Tall grass and weeds complaints on private property",
      soql: {
        where: "sr_type_desc = 'TALL GRASS/WEEDS, PRIVATE PROP'",
        order: "date_created DESC",
        limit: 1000,
      },
    },
    {
      question: "Requests for trash collection this year",
      soql: {
        where: "sr_type_desc = 'TRASH, REQUEST FOR COLLECTION' AND date_created > '2026-01-01T00:00:00'",
        order: "date_created DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
