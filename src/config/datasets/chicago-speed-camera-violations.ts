import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "hhkd-xvj4",
  domain: "data.cityofchicago.org",
  name: "Chicago Speed Camera Violations",
  description:
    "Daily violation counts from Chicago's Automated Speed Enforcement Program cameras in Children's Safety Zones near schools and parks. Each row is one camera-day count, not an individual violation record.",
  geo: { mode: "native", field: "location" },
  mapColor: "#e07a1f",
  categoryField: "address",
  fields: [
    { name: "address", type: "text", description: "Street address of the camera", facetable: true },
    { name: "camera_id", type: "text", description: "Unique identifier for the camera" },
    { name: "violation_date", type: "floating_timestamp", description: "Date the violations were recorded" },
    { name: "violations", type: "number", description: "Count of violations recorded at this camera on this date" },
    { name: "latitude", type: "number", description: "Latitude of the camera" },
    { name: "longitude", type: "number", description: "Longitude of the camera" },
    { name: "location", type: "point", description: "Point geometry of the camera, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Speed camera violations at 10318 S Indianapolis in Chicago",
      soql: {
        where: "address = '10318 S INDIANAPOLIS'",
        order: "violation_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Speed camera violations in Chicago in the last two months",
      soql: {
        where: "violation_date > '2026-05-01T00:00:00'",
        order: "violation_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Speed camera violations in the Chicago Loop",
      soql: {
        where: "within_circle(location, 41.8836, -87.6270, 3000)",
        order: "violation_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Days with 50+ speed camera violations at a single Chicago camera",
      soql: {
        where: "violations > 50",
        order: "violation_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Speed camera violations on Indianapolis Ave in Chicago",
      soql: {
        where: "address like '%INDIANAPOLIS%'",
        order: "violation_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Which Chicago speed cameras recorded violations in the last two months?",
      soql: {
        where: "violation_date > '2026-05-01T00:00:00' AND violations > 0",
        order: "violation_date DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
