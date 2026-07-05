import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "6hui-dvrh",
  domain: "data.honolulu.gov",
  name: "Honolulu 311 Reports",
  description:
    "Honolulu 311 reports, including potholes, streetlight outages, parking issues, and other non-emergency requests, with type, status, description, and location. A small, recently-launched dataset (well under 1,000 rows as of this writing) — city/zip fields are present in the schema but always blank in practice.",
  geo: { mode: "native", field: "location" },
  mapColor: "#2fa88f",
  categoryField: "requesttype",
  fields: [
    { name: "id", type: "number", description: "Unique identifier for the report" },
    { name: "datecreated", type: "floating_timestamp", description: "Date/time the report was created" },
    { name: "dateupdated", type: "floating_timestamp", description: "Date/time the report was last updated" },
    {
      name: "statustype",
      type: "text",
      description: "Status of the report, e.g. 'Submitted', 'Received', 'InProcess', 'Closed', 'Duplicate'",
      facetable: true,
    },
    {
      name: "requesttype",
      type: "text",
      description:
        "Request type, e.g. 'Pothole', 'Streetlight', 'Parking Issues', 'Homeless Concerns', 'Traffic Signal', 'Feral Chicken Nuisance'",
      facetable: true,
    },
    { name: "description", type: "text", description: "Free-text description of the report" },
    { name: "location", type: "point", description: "Point geometry of the report location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Pothole reports in Honolulu",
      soql: {
        where: "requesttype = 'Pothole'",
        order: "datecreated DESC",
        limit: 1000,
      },
    },
    {
      question: "Streetlight reports in Honolulu nobody's picked up yet",
      soql: {
        where: "requesttype = 'Streetlight' AND statustype = 'Submitted'",
        order: "datecreated DESC",
        limit: 1000,
      },
    },
    {
      question: "Homeless concerns reported to 311 in Honolulu",
      soql: {
        where: "requesttype = 'Homeless Concerns'",
        order: "datecreated DESC",
        limit: 1000,
      },
    },
    {
      question: "Parking issues near Ala Moana Center in Honolulu",
      soql: {
        where: "requesttype like '%Parking%' AND within_circle(location, 21.2916, -157.8420, 3000)",
        order: "datecreated DESC",
        limit: 1000,
      },
    },
    {
      question: "Which 311 reports in Honolulu are still open?",
      soql: {
        where: "statustype = 'Submitted' OR statustype = 'InProcess'",
        order: "datecreated DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
