import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "calgary-intersection-safety-cameras",
  resourceId: "dv2f-necx",
  domain: "data.calgary.ca",
  name: "Calgary Intersection Safety Cameras",
  description:
    "Locations of Calgary's Intersection Safety Cameras (ISCs), which detect vehicle speed and whether a vehicle fails to stop at a red light.",
  geo: { mode: "native", field: "point" },
  mapColor: "#c2571a",
  categoryField: "quadrant",
  fields: [
    { name: "description", type: "text", description: "Intersection and direction of travel, e.g. 'Macleod Trail and 12 Avenue S.E. Direction: Northbound' (formatting varies, match with LIKE against the street name)" },
    { name: "quadrant", type: "text", description: "City quadrant: 'NE', 'NW', 'SE', or 'SW'", facetable: true },
    { name: "community", type: "text", description: "Community name in upper case, e.g. 'BELTLINE', 'HAYSBORO', 'DOWNTOWN COMMERCIAL CORE'", facetable: true },
    { name: "ward", type: "number", description: "City council ward number (some cameras have no ward)", facetable: true },
    { name: "point", type: "point", description: "Point geometry of the camera location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Intersection safety cameras in Calgary's southeast quadrant",
      soql: { where: "quadrant = 'SE'", limit: 1000 },
    },
    {
      question: "Intersection safety cameras in the Beltline in Calgary",
      soql: { where: "community = 'BELTLINE'", limit: 1000 },
    },
    {
      question: "Intersection safety cameras on Macleod Trail in Calgary",
      soql: { where: "description like '%Macleod Trail%'", limit: 1000 },
    },
    {
      question: "Intersection safety cameras in Calgary ward 9",
      soql: { where: "ward = 9", limit: 1000 },
    },
    {
      question: "Intersection safety cameras near downtown Calgary",
      soql: { where: "within_circle(point, 51.0486, -114.0708, 2000)", limit: 1000 },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
