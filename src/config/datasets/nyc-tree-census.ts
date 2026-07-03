import { SOCRATA_DOMAIN } from "../constants";
import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  id: "uvpi-gqnh",
  domain: SOCRATA_DOMAIN,
  name: "2015 Street Tree Census",
  description:
    "A point-in-time census of every street tree in NYC conducted in 2015 by volunteers and staff, including species, health, and location. Does not reflect trees planted or removed since 2015.",
  geo: { mode: "latlon", latField: "latitude", lonField: "longitude" },
  mapColor: "#0b5d3b",
  categoryField: "spc_common",
  fields: [
    { name: "tree_id", type: "text", description: "Unique identifier for the tree" },
    { name: "status", type: "text", description: "Tree status: 'Alive', 'Dead', or 'Stump'", facetable: true },
    { name: "health", type: "text", description: "Health rating for living trees: 'Good', 'Fair', or 'Poor'", facetable: true },
    { name: "spc_common", type: "text", description: "Common species name, e.g. 'red maple', 'honeylocust', 'London planetree'", facetable: true },
    { name: "spc_latin", type: "text", description: "Latin species name" },
    { name: "boroname", type: "text", description: "Borough name, one of: Manhattan, Bronx, Brooklyn, Queens, Staten Island", facetable: true },
    { name: "zip_city", type: "text", description: "Postal city/neighborhood name" },
    { name: "zipcode", type: "text", description: "ZIP code of the tree location" },
    { name: "address", type: "text", description: "Nearest street address" },
    { name: "tree_dbh", type: "number", description: "Trunk diameter in inches, measured at breast height" },
    { name: "latitude", type: "number", description: "Latitude of the tree location" },
    { name: "longitude", type: "number", description: "Longitude of the tree location" },
  ],
  exemplars: [
    {
      question: "Show me trees in Brooklyn",
      soql: {
        where: "boroname = 'Brooklyn'",
        limit: 1000,
      },
    },
    {
      question: "Dead trees in the Bronx",
      soql: {
        where: "status = 'Dead' AND boroname = 'Bronx'",
        limit: 1000,
      },
    },
    {
      question: "Healthy London planetrees in Manhattan",
      soql: {
        where: "spc_common = 'London planetree' AND health = 'Good' AND boroname = 'Manhattan'",
        limit: 1000,
      },
    },
    {
      question: "Trees with poor health citywide",
      soql: {
        where: "health = 'Poor'",
        limit: 1000,
      },
    },
    {
      question: "Which species show up with even one dead tree in Queens?",
      soql: {
        where: "status = 'Dead' AND boroname = 'Queens'",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
