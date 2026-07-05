import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "kh8p-hcbm",
  domain: "data.ny.gov",
  name: "MTA Bus Automated Camera Enforcement Violations",
  description:
    "Bus lane, bus stop, and double-parking violations captured by MTA's automated bus camera enforcement (ACE) program under NY State's expanded bus camera enforcement law. Covers violations detected by cameras mounted on buses and at bus stops.",
  geo: { mode: "native", field: "violation_georeference" },
  mapColor: "#c8102e",
  categoryField: "violation_type",
  fields: [
    { name: "violation_id", type: "text", description: "Unique identifier for the violation" },
    { name: "vehicle_id", type: "text", description: "Anonymized/obscured identifier for the offending vehicle" },
    { name: "first_occurrence", type: "floating_timestamp", description: "Date/time the violation was first detected" },
    { name: "last_occurrence", type: "floating_timestamp", description: "Date/time the violation was last detected (for repeated/continuing violations)" },
    { name: "violation_status", type: "text", description: "Status of the violation, e.g. 'VIOLATION ISSUED', 'EXEMPT'", facetable: true },
    { name: "violation_type", type: "text", description: "Type of violation, e.g. 'MOBILE BUS STOP', 'MOBILE BUS LANE', 'DOUBLE PARKED'", facetable: true },
    { name: "bus_route_id", type: "text", description: "MTA bus route associated with the enforcement camera, e.g. 'B44+', 'M15+' (a trailing '+' denotes a route variant, so match with LIKE rather than exact equality)", facetable: true },
    { name: "stop_name", type: "text", description: "Name of the nearest bus stop" },
    { name: "violation_latitude", type: "number", description: "Latitude of the violation location" },
    { name: "violation_longitude", type: "number", description: "Longitude of the violation location" },
    { name: "violation_georeference", type: "point", description: "Point geometry of the violation location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Bus lane violations on the B44 in NYC",
      soql: {
        where: "bus_route_id like '%B44%' AND violation_type like '%BUS LANE%'",
        order: "first_occurrence DESC",
        limit: 1000,
      },
    },
    {
      question: "Recent double-parked violations in NYC",
      soql: {
        where: "violation_type like '%DOUBLE PARKED%'",
        order: "first_occurrence DESC",
        limit: 1000,
      },
    },
    {
      question: "Violations on the M15 in NYC in the last month",
      soql: {
        where: "bus_route_id like '%M15%' AND first_occurrence > '2026-06-02T00:00:00'",
        order: "first_occurrence DESC",
        limit: 1000,
      },
    },
    {
      question: "Bus stop violations issued citywide in NYC",
      soql: {
        where: "violation_type like '%BUS STOP%' AND violation_status = 'VIOLATION ISSUED'",
        order: "first_occurrence DESC",
        limit: 1000,
      },
    },
    {
      question: "Which NYC routes have even a single bus lane violation?",
      soql: {
        where: "violation_type like '%BUS LANE%'",
        order: "first_occurrence DESC",
        limit: 1000,
      },
    },
    {
      question: "Bus lane violations near Barclays Center in NYC",
      soql: {
        where: "violation_type like '%BUS LANE%' AND within_circle(violation_georeference, 40.6852, -73.9764, 1500)",
        order: "first_occurrence DESC",
        limit: 1000,
      },
    },
    {
      question: "Bus stop violations on Flushing Ave in NYC",
      soql: {
        where: "violation_type like '%BUS STOP%' AND stop_name like '%FLUSHING AV%'",
        order: "first_occurrence DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
