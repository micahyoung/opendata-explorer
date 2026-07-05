import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "xwdj-i9he",
  domain: "data.austintexas.gov",
  name: "Austin 311 Public Data",
  description:
    "Austin 311 service requests, including code enforcement, traffic signal issues, garbage/recycling/compost collection, loose dog reports, and other non-emergency requests, with type, responsible department, status, and location.",
  geo: { mode: "native", field: "sr_location_lat_long" },
  mapColor: "#8a5a2f",
  categoryField: "sr_type_desc",
  fields: [
    { name: "sr_number", type: "text", description: "Unique identifier for the service request" },
    { name: "sr_created_date", type: "floating_timestamp", description: "Date/time the request was created" },
    { name: "sr_closed_date", type: "floating_timestamp", description: "Date/time the request was closed" },
    {
      name: "sr_status_desc",
      type: "text",
      description: "Status of the request, e.g. 'Open', 'New', 'Work In Progress', 'Resolved', 'Closed'",
      facetable: true,
    },
    { name: "sr_department_desc", type: "text", description: "City department responsible for the request, e.g. 'Austin Resource Recovery', 'Transportation', 'Animal Services Office'", facetable: true },
    {
      name: "sr_type_desc",
      type: "text",
      description:
        "Request type, e.g. 'Austin Code - Request Code Officer', 'Traffic Signal - Maintenance', 'ARR - Garbage', 'Loose Dog', 'APD - Non Emergency Noise/Alarm'",
      facetable: true,
    },
    { name: "sr_location", type: "text", description: "Street address of the request" },
    { name: "sr_location_council_district", type: "number", description: "City Council district number" },
    { name: "sr_location_lat", type: "number", description: "Latitude of the request location" },
    { name: "sr_location_long", type: "number", description: "Longitude of the request location" },
    { name: "sr_location_lat_long", type: "point", description: "Point geometry of the request location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Open loose dog reports in Austin",
      soql: {
        where: "sr_type_desc = 'Loose Dog' AND sr_status_desc = 'Open'",
        order: "sr_created_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Code enforcement requests handled by the Austin Code Department",
      soql: {
        where: "sr_department_desc = 'Austin Code Department'",
        order: "sr_created_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Traffic signal maintenance requests in Austin",
      soql: {
        where: "sr_type_desc = 'Traffic Signal - Maintenance'",
        order: "sr_created_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Garbage collection requests in Austin's Council District 3",
      soql: {
        where: "sr_type_desc = 'ARR - Garbage' AND sr_location_council_district = 3",
        order: "sr_created_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Noise and alarm complaints in downtown Austin every July 4th since 2020",
      soql: {
        where:
          "sr_type_desc = 'APD - Non Emergency Noise/Alarm' AND within_circle(sr_location_lat_long, 30.2680536, -97.7447642, 1500) AND date_extract_m(sr_created_date) = 7 AND date_extract_d(sr_created_date) = 4 AND sr_created_date >= '2020-01-01T00:00:00'",
        order: "sr_created_date DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
