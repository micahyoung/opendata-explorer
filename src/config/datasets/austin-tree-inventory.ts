import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  id: "wrik-xasw",
  domain: "data.austintexas.gov",
  name: "Austin Tree Inventory",
  description:
    "Point locations of public trees inventoried by the City of Austin, compiled from Development Services, AISD, Parks and Recreation, and Public Works sources. Not a complete comprehensive inventory of all trees in the city.",
  geo: { mode: "native", field: "geometry" },
  mapColor: "#b8860b",
  categoryField: "species",
  fields: [
    {
      name: "species",
      type: "text",
      description:
        "Common species name, e.g. 'Pecan', 'Crapemyrtle', 'Southern Live Oak'. Formatting is inconsistent for the same species across rows (e.g. 'Cedar Elm' vs 'Elm, Cedar' both appear) — prefer LIKE matching on a key term over exact equality unless the exact string is known.",
      facetable: true,
    },
    { name: "diameter", type: "number", description: "Trunk diameter in inches, measured at breast height (DBH)" },
    { name: "latitude", type: "number", description: "Latitude of the tree location" },
    { name: "longtitude", type: "number", description: "Longitude of the tree location (note: this is the actual source column name, misspelled upstream)" },
    { name: "geometry", type: "point", description: "Point geometry of the tree location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Pecan trees in Austin",
      soql: {
        where: "species = 'Pecan'",
        limit: 1000,
      },
    },
    {
      question: "Crapemyrtles in Austin",
      soql: {
        where: "species = 'Crapemyrtle'",
        limit: 1000,
      },
    },
    {
      question: "Large trees in Austin with a trunk diameter over 30 inches",
      soql: {
        where: "diameter > 30",
        limit: 1000,
      },
    },
    {
      question: "Large Southern Live Oaks in Austin",
      soql: {
        where: "species like '%Live Oak%' AND diameter > 24",
        limit: 1000,
      },
    },
    {
      question: "Live Oaks near Zilker Park in Austin",
      soql: {
        where: "species like '%Live Oak%' AND within_circle(geometry, 30.2669, -97.7728, 1500)",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
