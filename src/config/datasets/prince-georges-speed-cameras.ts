import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "mnkf-cu5c",
  domain: "data.princegeorgescountymd.gov",
  name: "Prince George's County Speed Cameras",
  description:
    "Locations of Prince George's County, Maryland school-zone speed cameras (trailer-mounted units), with the school each serves, the posted speed limit, and the speed at which enforcement begins.",
  geo: { mode: "native", field: "location_1" },
  mapColor: "#8a3ab9",
  categoryField: "district",
  fields: [
    { name: "district", type: "text", description: "Police district in Roman numerals: 'I', 'II', 'III', 'IV', 'V', or 'VI'", facetable: true },
    { name: "trailer", type: "text", description: "Camera trailer identifier, e.g. 'T-074'" },
    { name: "school", type: "text", description: "Name of the school the camera serves, e.g. 'Deerfield Run Elementary', 'Thomas Johnson Middle School' (names are abbreviated inconsistently, match with LIKE)" },
    { name: "street_address", type: "text", description: "Street address of the camera" },
    { name: "posted_speed", type: "number", description: "Posted speed limit at the camera, in mph (25, 30, 35, 40, or 50)", facetable: true },
    { name: "enforcement", type: "number", description: "Speed in mph at which the camera begins issuing citations (typically 12 over the posted limit)" },
    { name: "location", type: "text", description: "Free-text description of the camera's location including a coordinate string" },
    { name: "location_1", type: "location", description: "Point location of the camera, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Speed cameras in Prince George's County police district VI",
      soql: { where: "district = 'VI'", limit: 1000 },
    },
    {
      question: "Speed cameras near elementary schools in Prince George's County",
      soql: { where: "school like '%Elementary%' OR school like '% ES'", limit: 1000 },
    },
    {
      question: "Speed cameras on 40 mph roads in Prince George's County",
      soql: { where: "posted_speed = 40", limit: 1000 },
    },
    {
      question: "Speed cameras on Laurel Bowie Road in Prince George's County",
      soql: { where: "street_address like '%Laurel Bowie%'", limit: 1000 },
    },
    {
      question: "Speed cameras within 5 miles of Bowie, Maryland",
      soql: { where: "within_circle(location_1, 38.9427, -76.7302, 8000)", limit: 1000 },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
