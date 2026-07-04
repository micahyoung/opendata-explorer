import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

// MyLA311 publishes a new dataset resource ID every calendar year (this one
// covers 2025). There is no stable cross-year ID; when a new year's data
// stops updating, replace this ID with the new year's dataset.
const definition: DatasetDefinition = {
  id: "h73f-gn57",
  domain: "data.lacity.org",
  name: "MyLA311 Service Request Data (2025)",
  description:
    "Los Angeles MyLA311 service requests for 2025, including bulky item pickup, graffiti removal, illegal dumping, homeless encampment reports, and other non-emergency requests, with type, status, and location.",
  geo: { mode: "native", field: "location" },
  mapColor: "#6a8f1f",
  categoryField: "requesttype",
  fields: [
    { name: "srnumber", type: "text", description: "Unique identifier for the service request" },
    { name: "createddate", type: "floating_timestamp", description: "Date/time the request was created" },
    { name: "closeddate", type: "floating_timestamp", description: "Date/time the request was closed" },
    { name: "status", type: "text", description: "Status of the request: 'Open', 'Pending', 'Closed', 'Cancelled', 'Referred Out', or 'Forward'", facetable: true },
    { name: "owner", type: "text", description: "City department responsible for the request, e.g. 'LASAN', 'LAPD'", facetable: true },
    {
      name: "requesttype",
      type: "text",
      description:
        "Request type, e.g. 'Bulky Items', 'Graffiti Removal', 'Illegal Dumping Pickup', 'Homeless Encampment', 'Metal/Household Appliances'",
      facetable: true,
    },
    { name: "address", type: "text", description: "Street address of the request" },
    { name: "cd", type: "number", description: "City Council District number" },
    { name: "ncname", type: "text", description: "Neighborhood Council name", facetable: true },
    { name: "latitude", type: "number", description: "Latitude of the request location" },
    { name: "longitude", type: "number", description: "Longitude of the request location" },
    { name: "location", type: "point", description: "Point geometry of the request location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Bulky item pickup requests in LA",
      soql: {
        where: "requesttype = 'Bulky Items'",
        order: "createddate DESC",
        limit: 1000,
      },
    },
    {
      question: "Graffiti removal requests in Council District 9",
      soql: {
        where: "requesttype = 'Graffiti Removal' AND cd = 9",
        order: "createddate DESC",
        limit: 1000,
      },
    },
    {
      question: "Bulky item requests that are still pending",
      soql: {
        where: "requesttype = 'Bulky Items' AND status = 'Pending'",
        order: "createddate DESC",
        limit: 1000,
      },
    },
    {
      question: "Bulky item requests in Boyle Heights",
      soql: {
        where: "requesttype = 'Bulky Items' AND ncname = 'Boyle Heights'",
        order: "createddate DESC",
        limit: 1000,
      },
    },
    {
      question: "Illegal dumping pickups handled by LASAN",
      soql: {
        where: "requesttype = 'Illegal Dumping Pickup' AND owner = 'LASAN'",
        order: "createddate DESC",
        limit: 1000,
      },
    },
    {
      question: "Bulky item requests near Hollywood on the first of each month in 2025",
      soql: {
        where:
          "requesttype = 'Bulky Items' AND within_circle(location, 34.0980031, -118.3295230, 2000) AND date_extract_d(createddate) = 1 AND createddate >= '2025-01-01T00:00:00' AND createddate < '2026-01-01T00:00:00'",
        order: "createddate DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
