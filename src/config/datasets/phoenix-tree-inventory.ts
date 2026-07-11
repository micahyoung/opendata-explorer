import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "phoenix-tree-inventory",
  featureServerUrl:
    "https://services1.arcgis.com/k3vhq11XkBNeeOfM/arcgis/rest/services/TreeInventoryLive_ViewUFWebPage/FeatureServer/0",
  name: "Phoenix Tree Inventory",
  description:
    "City of Phoenix's living inventory of public trees with species, trunk diameter (DBH), condition, overhead utility proximity, neighborhood, planning district, and status.",
  mapColor: "#2d7a4f",
  categoryField: "SPP",
  fields: [
    { name: "SPP", type: "esriFieldTypeString", description: "Species (scientific name), e.g. 'Lagerstroemia indica', 'Quercus phellos', 'Acer rubrum'. Also includes vacant site entries.", facetable: true },
    { name: "DBH", type: "esriFieldTypeDouble", description: "Trunk diameter at breast height in inches" },
    { name: "COND", type: "esriFieldTypeString", description: "Tree condition: 'Good', 'Fair', 'Poor', 'NewPlant' (New Planting), 'VSS' (Vacant Site Small), 'Dead', 'Stump'", facetable: true },
    { name: "UTILITIES", type: "esriFieldTypeString", description: "Overhead utility proximity: 'Y' or 'N'", facetable: true },
    { name: "TRUNKS", type: "esriFieldTypeDouble", description: "Number of trunks" },
    { name: "AREA", type: "esriFieldTypeString", description: "Neighborhood name", facetable: true },
    { name: "P_DIST", type: "esriFieldTypeString", description: "Planning district, e.g. 'Broad Rock', 'Downtown', 'East', 'Far West', 'Huguenot'", facetable: true },
    { name: "C_DIST", type: "esriFieldTypeString", description: "Council district number", facetable: true },
    { name: "CULTIVAR", type: "esriFieldTypeString", description: "Cultivar or variety, e.g. 'Multi-stem', 'Rotundiloba'" },
    { name: "AddrLabl", type: "esriFieldTypeString", description: "Full address label" },
    { name: "Status", type: "esriFieldTypeString", description: "Tree status: 'In Service', 'Retired', 'OOS' (Out of Service), 'Planned'", facetable: true },
  ],
  exemplars: [
    {
      question: "Good condition trees in Phoenix",
      query: { where: "COND = 'Good'" },
    },
    {
      question: "Crape myrtles in Phoenix",
      query: { where: "SPP = 'Lagerstroemia indica'" },
    },
    {
      question: "Phoenix trees near overhead utilities",
      query: { where: "UTILITIES = 'Y'" },
    },
    {
      question: "Large Phoenix trees with DBH over 24 inches",
      query: { where: "DBH > 24" },
    },
    {
      question: "Trees in downtown Phoenix",
      query: {
        where: "1=1",
        minLat: 33.440,
        maxLat: 33.465,
        minLon: -112.095,
        maxLon: -112.060,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
