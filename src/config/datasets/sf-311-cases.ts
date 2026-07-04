import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  id: "vw6y-z8j6",
  domain: "data.sfgov.org",
  name: "SF 311 Cases",
  description:
    "San Francisco 311 cases, including street/sidewalk cleaning, graffiti, parking enforcement, encampments, and other non-emergency requests, with category, responsible agency, status, and location.",
  geo: { mode: "native", field: "point" },
  mapColor: "#a8326b",
  categoryField: "service_name",
  fields: [
    { name: "service_request_id", type: "text", description: "Unique identifier for the case" },
    { name: "requested_datetime", type: "floating_timestamp", description: "Date/time the case was opened" },
    { name: "closed_date", type: "floating_timestamp", description: "Date/time the case was closed" },
    { name: "status_description", type: "text", description: "Status of the case, e.g. 'Open', 'Closed'", facetable: true },
    { name: "agency_responsible", type: "text", description: "Agency/queue responsible for the case, e.g. 'DPW Ops Queue'", facetable: true },
    {
      name: "service_name",
      type: "text",
      description:
        "Case category, e.g. 'Street and Sidewalk Cleaning', 'Parking Enforcement', 'Abandoned Vehicle', 'Tree Maintenance'. Category names were renamed mid-2024 (e.g. 'Encampments' -> 'Encampment', 'Graffiti' -> 'Graffiti Public'/'Graffiti Private') so older and newer rows may use different values for a similar concept.",
      facetable: true,
    },
    { name: "service_subtype", type: "text", description: "More specific request type within the category" },
    { name: "address", type: "text", description: "Street address of the case" },
    { name: "analysis_neighborhood", type: "text", description: "Neighborhood of the case location", facetable: true },
    { name: "supervisor_district", type: "number", description: "Board of Supervisors district number" },
    { name: "lat", type: "number", description: "Latitude of the case location" },
    { name: "long", type: "number", description: "Longitude of the case location" },
    { name: "point", type: "point", description: "Point geometry of the case location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Street and sidewalk cleaning cases in the Mission",
      soql: {
        where: "service_name = 'Street and Sidewalk Cleaning' AND analysis_neighborhood = 'Mission'",
        order: "requested_datetime DESC",
        limit: 1000,
      },
    },
    {
      question: "Open graffiti cases",
      soql: {
        where: "service_name = 'Graffiti' AND status_description = 'Open'",
        order: "requested_datetime DESC",
        limit: 1000,
      },
    },
    {
      question: "Encampment reports this year",
      soql: {
        where: "service_name = 'Encampment' AND requested_datetime > '2026-01-01T00:00:00'",
        order: "requested_datetime DESC",
        limit: 1000,
      },
    },
    {
      question: "Abandoned vehicle cases in Supervisor District 9",
      soql: {
        where: "service_name = 'Abandoned Vehicle' AND supervisor_district = 9",
        order: "requested_datetime DESC",
        limit: 1000,
      },
    },
    {
      question: "Noise complaints in the Tenderloin every New Year's Eve since 2020",
      soql: {
        where:
          "(service_name = 'Noise' OR service_name = 'Noise Report') AND within_circle(point, 37.7842493, -122.4139933, 1000) AND date_extract_m(requested_datetime) = 12 AND date_extract_d(requested_datetime) = 31 AND requested_datetime >= '2020-01-01T00:00:00'",
        order: "requested_datetime DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
