import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  id: "tkzw-k3nq",
  domain: "data.sfgov.org",
  name: "SF Street Tree List",
  description:
    "A list of street trees maintained by DPW and other agencies/entities in San Francisco, including species, planting date, trunk diameter, and location.",
  geo: { mode: "native", field: "location" },
  mapColor: "#1f4e8c",
  categoryField: "qcaretaker",
  fields: [
    { name: "treeid", type: "text", description: "Unique identifier for the tree" },
    { name: "qlegalstatus", type: "text", description: "Legal status, e.g. 'Permitted Site', 'Landmark tree'", facetable: true },
    { name: "qspecies", type: "text", description: "Species in 'Latin :: Common' format, e.g. 'Platanus x hispanica :: Sycamore: London Plane' (match with LIKE against the common-name portion)", facetable: true },
    { name: "qaddress", type: "text", description: "Street address nearest the tree" },
    { name: "planttype", type: "text", description: "'Tree' or 'Landscaping'", facetable: true },
    { name: "qcaretaker", type: "text", description: "Agency/entity responsible for maintenance, e.g. 'DPW', 'Private', 'SFUSD', 'Port', 'Rec-Park', 'PUC', 'MTA'", facetable: true },
    { name: "plantdate", type: "floating_timestamp", description: "Date the tree was planted" },
    { name: "dbh", type: "number", description: "Trunk diameter in inches, measured at breast height" },
    { name: "latitude", type: "number", description: "Latitude of the tree location" },
    { name: "longitude", type: "number", description: "Longitude of the tree location" },
    { name: "location", type: "point", description: "Point geometry of the tree location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Street trees in SF maintained by DPW",
      soql: {
        where: "qcaretaker = 'DPW'",
        limit: 1000,
      },
    },
    {
      question: "Trees planted in SF since 2020",
      soql: {
        where: "plantdate > '2020-01-01T00:00:00'",
        limit: 1000,
      },
    },
    {
      question: "London Plane trees in SF",
      soql: {
        where: "qspecies like '%London Plane%'",
        limit: 1000,
      },
    },
    {
      question: "Landmark trees in SF",
      soql: {
        where: "qlegalstatus = 'Landmark tree'",
        limit: 1000,
      },
    },
    {
      question: "London Plane trees near Golden Gate Park in SF",
      soql: {
        where: "qspecies like '%London Plane%' AND within_circle(location, 37.7694, -122.4862, 1500)",
        limit: 1000,
      },
    },
    {
      question: "Large privately-maintained trees in SF",
      soql: {
        where: "qcaretaker = 'Private' AND dbh > 24",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
