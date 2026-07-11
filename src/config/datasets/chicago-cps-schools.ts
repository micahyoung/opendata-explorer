import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "hexd-c4gn",
  domain: "data.cityofchicago.org",
  name: "Chicago Public Schools — School Locations SY2425",
  description:
    "Locations of Chicago Public Schools (CPS) campuses for School Year 2024-2025, with school name, address, and grade category. Native point geometry.",
  geo: { mode: "native", field: "the_geom" },
  mapColor: "#7b5ea7",
  categoryField: "Grade_Cat",
  fields: [
    { name: "the_geom", type: "point", description: "Point geometry of the school location" },
    { name: "School_ID", type: "text", description: "CPS school identification number" },
    { name: "Short_Name", type: "text", description: "School name, e.g. 'NOBLE - COMER'" },
    { name: "Address", type: "text", description: "Street address of the school" },
    {
      name: "Grade_Cat",
      type: "text",
      description: "Grade category: 'HS' (high school), 'ES' (elementary school), 'IS' (intermediate school), 'AC' (academy)",
      facetable: true,
    },
    { name: "Lat", type: "number", description: "Latitude of the school location" },
    { name: "Long", type: "number", description: "Longitude of the school location" },
  ],
  exemplars: [
    {
      question: "High schools in Chicago",
      soql: {
        where: "Grade_Cat = 'HS'",
        limit: 1000,
      },
    },
    {
      question: "Elementary schools in Chicago",
      soql: {
        where: "Grade_Cat = 'ES'",
        limit: 1000,
      },
    },
    {
      question: "CPS schools on the South Side",
      soql: {
        where: "Lat < 41.85",
        limit: 1000,
      },
    },
    {
      question: "CPS schools near Hyde Park",
      soql: {
        where: "within_circle(the_geom, 41.794, -87.591, 2000)",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
