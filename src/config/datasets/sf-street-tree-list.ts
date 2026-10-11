import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "sf-street-tree-list",
  resourceId: "tkzw-k3nq",
  domain: "data.sf.gov",
  name: "SF Street Tree List",
  description:
    "A list of street trees maintained by DPW and other agencies/entities in San Francisco, including species, planting date, trunk diameter, and location.",
  geo: { mode: "latlon", latField: "latitude", lonField: "longitude" },
  mapColor: "#1f4e8c",
  categoryField: "species",
  fields: [
    { name: "treeid", type: "number", description: "Unique identifier for the tree" },
    { name: "legalstatus", type: "text", description: "Legal status, e.g. 'DPW Maintained', 'Significant Tree', 'Landmark tree', 'Permitted Site', 'Private', 'Undocumented'", facetable: true },
    { name: "species", type: "text", description: "Species in 'Latin :: Common' format, e.g. 'Platanus x hispanica :: Sycamore: London Plane' (match with LIKE against the common-name portion)", facetable: true },
    { name: "description", type: "text", description: "Address of the tree, with tree number at that address, e.g. '427 33rd Ave | Tree 1'" },
    { name: "planttype", type: "text", description: "'Tree' or 'Landscaping'", facetable: true },
    { name: "planter", type: "text", description: "Agency/entity that planted the tree, e.g. 'Private', 'DPW', 'FUF', 'SFUSD', 'Rec/Park', 'Port', 'MTA' (blank for many records)", facetable: true },
    { name: "waterresponsibility", type: "text", description: "Agency/entity responsible for watering, e.g. 'Private', 'DPW', 'FUF', 'Clean City' (blank for many records)", facetable: true },
    { name: "planteddate", type: "text", description: "Date planted as 'YYYY-MM-DD' text (blank for most records); compare as a string, e.g. planteddate > '2020-01-01'" },
    { name: "mapdbh", type: "text", description: "Trunk diameter in inches at breast height, stored as text; cast to compare numerically, e.g. mapdbh::number > 24" },
    { name: "onstreet", type: "text", description: "Street name where the tree is located" },
    { name: "analysis_neighborhood", type: "text", description: "Analysis neighborhood, e.g. 'Inner Sunset'", facetable: true },
    { name: "zip_code", type: "text", description: "Zip code where the tree is located" },
    { name: "latitude", type: "number", description: "Latitude of the tree location" },
    { name: "longitude", type: "number", description: "Longitude of the tree location" },
  ],
  exemplars: [
    {
      question: "Street trees in SF maintained by DPW",
      soql: {
        where: "legalstatus = 'DPW Maintained'",
        limit: 1000,
      },
    },
    {
      question: "Trees planted in SF since 2020",
      soql: {
        where: "planteddate > '2020-01-01'",
        limit: 1000,
      },
    },
    {
      question: "London Plane trees in SF",
      soql: {
        where: "species like '%London Plane%'",
        limit: 1000,
      },
    },
    {
      question: "Landmark trees in SF",
      soql: {
        where: "legalstatus = 'Landmark tree'",
        limit: 1000,
      },
    },
    {
      question: "London Plane trees near Golden Gate Park in SF",
      soql: {
        where: "species like '%London Plane%' AND latitude between 37.7559 and 37.7829 AND longitude between -122.5032 and -122.4692",
        limit: 1000,
      },
    },
    {
      question: "Large privately-planted trees in SF",
      soql: {
        where: "planter = 'Private' AND mapdbh::number > 24",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
