import { SOCRATA_DOMAIN } from "../constants";
import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  id: "erm2-nwe9",
  domain: SOCRATA_DOMAIN,
  name: "311 Service Requests",
  description:
    "NYC 311 service requests from 2010 to present. Complaints and requests made by residents to city agencies, including type, location, and status.",
  geo: { mode: "native", field: "location" },
  mapColor: "#d65a1f",
  categoryField: "complaint_type",
  fields: [
    { name: "unique_key", type: "text", description: "Unique identifier for the request" },
    { name: "created_date", type: "floating_timestamp", description: "Date/time the request was created" },
    { name: "closed_date", type: "floating_timestamp", description: "Date/time the request was closed" },
    { name: "agency", type: "text", description: "Acronym of the responding city agency, e.g. NYPD, DOT, DSNY", facetable: true },
    { name: "complaint_type", type: "text", description: "High-level complaint category, e.g. 'Noise - Residential', 'Illegal Parking', 'Street Condition'", facetable: true },
    { name: "descriptor", type: "text", description: "More specific description of the complaint type" },
    { name: "status", type: "text", description: "Status of the request, e.g. 'Open', 'Closed', 'In Progress'", facetable: true },
    { name: "borough", type: "text", description: "Borough, one of: MANHATTAN, BRONX, BROOKLYN, QUEENS, STATEN ISLAND", facetable: true },
    { name: "incident_zip", type: "text", description: "Incident location ZIP code" },
    { name: "city", type: "text", description: "City name of the incident location" },
    { name: "latitude", type: "number", description: "Latitude of the incident location" },
    { name: "longitude", type: "number", description: "Longitude of the incident location" },
    { name: "location", type: "point", description: "Point geometry of the incident location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Show me noise complaints in Queens this month",
      soql: {
        where: "complaint_type like '%Noise%' AND borough = 'QUEENS' AND created_date > '2026-06-01T00:00:00'",
        order: "created_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Show me all open 311 requests",
      soql: {
        where: "status = 'Open'",
        order: "created_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Illegal parking complaints in Brooklyn",
      soql: {
        where: "complaint_type = 'Illegal Parking' AND borough = 'BROOKLYN'",
        order: "created_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Rat sightings reported in the Bronx",
      soql: {
        where: "complaint_type = 'Rodent' AND borough = 'BRONX'",
        order: "created_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Noise complaints near Times Square",
      soql: {
        where: "complaint_type like '%Noise%' AND within_circle(location, 40.7580, -73.9855, 800)",
        order: "created_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Which agencies have gotten even one noise complaint?",
      soql: {
        where: "complaint_type like '%Noise%'",
        order: "created_date DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
