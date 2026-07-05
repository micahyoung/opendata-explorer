import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "v6vf-nfxy",
  domain: "data.cityofchicago.org",
  name: "Chicago 311 Service Requests",
  description:
    "Chicago 311 service requests, including graffiti removal, potholes, rodent complaints, aircraft noise, and other non-emergency requests, with type, responsible department, status, and location.",
  geo: { mode: "native", field: "location" },
  mapColor: "#2f7d7d",
  categoryField: "sr_type",
  fields: [
    { name: "sr_number", type: "text", description: "Unique identifier for the service request" },
    { name: "created_date", type: "floating_timestamp", description: "Date/time the request was created" },
    { name: "closed_date", type: "floating_timestamp", description: "Date/time the request was closed" },
    { name: "status", type: "text", description: "Status of the request, e.g. 'Open', 'Completed'", facetable: true },
    { name: "owner_department", type: "text", description: "City department responsible for the request, e.g. 'Streets and Sanitation', 'Aviation'", facetable: true },
    {
      name: "sr_type",
      type: "text",
      description:
        "Request type, e.g. 'Aircraft Noise Complaint', 'Graffiti Removal Request', 'Pothole in Street Complaint', 'Rodent Baiting/Rat Complaint'",
      facetable: true,
    },
    { name: "street_address", type: "text", description: "Street address of the request" },
    { name: "community_area", type: "text", description: "Community area number (numeric code, not a name)", facetable: true },
    { name: "ward", type: "text", description: "Ward number (numeric code, not a name)", facetable: true },
    { name: "latitude", type: "number", description: "Latitude of the request location" },
    { name: "longitude", type: "number", description: "Longitude of the request location" },
    { name: "location", type: "point", description: "Point geometry of the request location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Pothole complaints in Chicago",
      soql: {
        where: "sr_type = 'Pothole in Street Complaint'",
        order: "created_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Aircraft noise complaints in Chicago this month",
      soql: {
        where: "sr_type = 'Aircraft Noise Complaint' AND created_date > '2026-06-01T00:00:00'",
        order: "created_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Open graffiti removal requests in Chicago",
      soql: {
        where: "sr_type = 'Graffiti Removal Request' AND status = 'Open'",
        order: "created_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Rat complaints in Chicago handled by Streets and Sanitation",
      soql: {
        where: "sr_type = 'Rodent Baiting/Rat Complaint' AND owner_department = 'Streets and Sanitation'",
        order: "created_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Potholes near Millennium Park in Chicago",
      soql: {
        where: "sr_type = 'Pothole in Street Complaint' AND within_circle(location, 41.8826, -87.6226, 800)",
        order: "created_date DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
