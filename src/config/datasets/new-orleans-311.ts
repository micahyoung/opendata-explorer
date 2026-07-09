import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "2jgv-pqrq",
  domain: "data.nola.gov",
  name: "New Orleans 311 OPCD Calls",
  description:
    "New Orleans 311 service requests from 2012 to present, covering roads/drainage, trash/recycling, code enforcement, streetlights, traffic signals, and other non-emergency city service issues.",
  geo: { mode: "native", field: "geocoded_column" },
  mapColor: "#5b3a8e",
  categoryField: "request_type",
  fields: [
    { name: "service_request", type: "text", description: "Unique identifier for the request (SR#)" },
    {
      name: "request_type",
      type: "text",
      description:
        "Type of service requested, e.g. 'Roads/Drainage', 'Trash/Recycling', 'Property Maintenance', 'Streetlights', 'Traffic Signals', 'Abandoned Vehicles', 'Graffiti Removal'",
      facetable: true,
    },
    { name: "request_reason", type: "text", description: "More specific reason/subtype within the request type" },
    { name: "request_status", type: "text", description: "Current status of the request: 'Closed' or 'Pending'", facetable: true },
    {
      name: "responsible_agency",
      type: "text",
      description: "Agency handling the request, e.g. 'Department of Public Works', 'Department of Sanitation', 'Department of Code Enforcement'",
      facetable: true,
    },
    { name: "final_address", type: "text", description: "Address where the service was requested" },
    { name: "address_councildis", type: "text", description: "City council district number of the request location", facetable: true },
    { name: "date_created", type: "floating_timestamp", description: "Date/time the request was created" },
    { name: "case_close_date", type: "floating_timestamp", description: "Date/time the request was closed" },
    { name: "latitude", type: "number", description: "Latitude of the request location" },
    { name: "longitude", type: "number", description: "Longitude of the request location" },
    { name: "geocoded_column", type: "point", description: "Point geometry of the request location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Roads and drainage complaints in New Orleans",
      soql: {
        where: "request_type = 'Roads/Drainage'",
        order: "date_created DESC",
        limit: 1000,
      },
    },
    {
      question: "Pending trash and recycling requests in New Orleans",
      soql: {
        where: "request_type = 'Trash/Recycling' AND request_status = 'Pending'",
        order: "date_created DESC",
        limit: 1000,
      },
    },
    {
      question: "Graffiti removal requests in New Orleans council district B",
      soql: {
        where: "request_type = 'Graffiti Removal' AND address_councildis = 'B'",
        order: "date_created DESC",
        limit: 1000,
      },
    },
    {
      question: "Streetlight outage requests in New Orleans this year",
      soql: {
        where: "request_type = 'Streetlights' AND date_created > '2026-01-01T00:00:00'",
        order: "date_created DESC",
        limit: 1000,
      },
    },
    {
      question: "Abandoned vehicle reports near the French Quarter in New Orleans",
      soql: {
        where: "request_type = 'Abandoned Vehicles' AND within_circle(geocoded_column, 29.9584, -90.0644, 1500)",
        order: "date_created DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
