import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

// MyLA311 publishes a new dataset resource ID every calendar year (this one
// covers 2026). There is no stable cross-year ID; when a new year's data
// stops updating, replace this ID with the new year's dataset. Note: LA also
// migrated the underlying source system between 2025 and 2026, so field
// names changed (e.g. srnumber -> casenumber, requesttype -> type) — don't
// assume next year's rollover is a simple ID swap without re-checking columns.
const definition: DatasetDefinition = {
  backend: "socrata",
  id: "2cy6-i7zn",
  domain: "data.lacity.org",
  name: "MyLA311 Cases (2026)",
  description:
    "Los Angeles MyLA311 service requests for 2026, including bulky item pickup, graffiti removal, illegal dumping, homeless encampment reports, streetlight repair, and other non-emergency requests, with type, status, and location.",
  geo: { mode: "latlon", latField: "geolocation__latitude__s", lonField: "geolocation__longitude__s" },
  mapColor: "#6a8f1f",
  categoryField: "type",
  fields: [
    { name: "casenumber", type: "text", description: "Unique identifier for the service request" },
    { name: "createddate", type: "floating_timestamp", description: "Date/time the request was created" },
    { name: "closeddate", type: "floating_timestamp", description: "Date/time the request was closed" },
    { name: "status", type: "text", description: "Status of the request: 'New', 'Reported', 'In Progress', 'Workorder Created', 'Closed', 'Closed Ext-Referred', 'Cancelled', 'Potential Duplicate', 'Duplicate Confirm'", facetable: true },
    { name: "department_name__c", type: "text", description: "City department responsible for the request, e.g. 'LASAN', 'BSL', 'ITA'", facetable: true },
    {
      name: "type",
      type: "text",
      description:
        "Request type, e.g. 'Item Pickups', 'Graffiti Removal', 'Illegal Dumping Item Pickup', 'Homeless Encampment', 'Streetlight Repair Services'",
      facetable: true,
    },
    { name: "locator_gis_returned_address", type: "text", description: "Street address of the request" },
    { name: "locator_council_district", type: "number", description: "City Council District number" },
    { name: "locator_sr_neigborhood_council_1", type: "text", description: "Neighborhood Council name", facetable: true },
    { name: "geolocation__latitude__s", type: "number", description: "Latitude of the request location" },
    { name: "geolocation__longitude__s", type: "number", description: "Longitude of the request location" },
    { name: "location", type: "point", description: "Point geometry of the request location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Bulky item pickup requests in LA",
      soql: {
        where: "type = 'Item Pickups'",
        order: "createddate DESC",
        limit: 1000,
      },
    },
    {
      question: "Graffiti removal requests in LA's Council District 9",
      soql: {
        where: "type = 'Graffiti Removal' AND locator_council_district = 9",
        order: "createddate DESC",
        limit: 1000,
      },
    },
    {
      question: "Bulky item requests in LA that are still in progress",
      soql: {
        where: "type = 'Item Pickups' AND status = 'In Progress'",
        order: "createddate DESC",
        limit: 1000,
      },
    },
    {
      question: "Bulky item requests in Boyle Heights, LA",
      soql: {
        where: "type = 'Item Pickups' AND locator_sr_neigborhood_council_1 = 'BOYLE HEIGHTS NC'",
        order: "createddate DESC",
        limit: 1000,
      },
    },
    {
      question: "Illegal dumping pickups in LA handled by LASAN",
      soql: {
        where: "type = 'Illegal Dumping Item Pickup' AND department_name__c = 'LASAN'",
        order: "createddate DESC",
        limit: 1000,
      },
    },
    {
      question: "Bulky item requests near Hollywood in LA on the first of each month in 2026",
      soql: {
        where:
          "type = 'Item Pickups' AND geolocation__latitude__s between 34.080037 and 34.115969 AND geolocation__longitude__s between -118.351219 and -118.307827 AND date_extract_d(createddate) = 1 AND createddate >= '2026-01-01T00:00:00' AND createddate < '2027-01-01T00:00:00'",
        order: "createddate DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
