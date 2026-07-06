import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "spqx-js37",
  domain: "data.cityofchicago.org",
  name: "Chicago Red Light Camera Violations",
  description:
    "Daily violation counts from Chicago's Red Light Camera Program cameras at signalized intersections. Each row is one camera-day count, not an individual violation record.",
  geo: { mode: "native", field: "location" },
  mapColor: "#8c1f28",
  categoryField: "intersection",
  fields: [
    { name: "intersection", type: "text", description: "Intersection where the camera is located, e.g. 'ASHLAND AND IRVING PARK'", facetable: true },
    { name: "camera_id", type: "text", description: "Unique identifier for the camera" },
    { name: "address", type: "text", description: "Street address of the camera" },
    { name: "violation_date", type: "floating_timestamp", description: "Date the violations were recorded" },
    { name: "violations", type: "number", description: "Count of violations recorded at this camera on this date" },
    { name: "latitude", type: "number", description: "Latitude of the camera" },
    { name: "longitude", type: "number", description: "Longitude of the camera" },
    { name: "location", type: "point", description: "Point geometry of the camera, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Red light camera violations at Ashland and Irving Park in Chicago",
      soql: {
        where: "intersection = 'ASHLAND AND IRVING PARK'",
        order: "violation_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Red light camera violations in Chicago this month",
      soql: {
        where: "violation_date > '2026-06-01T00:00:00'",
        order: "violation_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Red light camera violations in the Chicago Loop",
      soql: {
        where: "within_circle(location, 41.8836, -87.6270, 3000)",
        order: "violation_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Days with 20+ red light violations at a single Chicago intersection",
      soql: {
        where: "violations > 20",
        order: "violation_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Red light camera violations on Irving Park Rd in Chicago",
      soql: {
        where: "intersection like '%IRVING PARK%'",
        order: "violation_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Which Chicago intersections had red light violations this month?",
      soql: {
        where: "violation_date > '2026-06-01T00:00:00' AND violations > 0",
        order: "violation_date DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
