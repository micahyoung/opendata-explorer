import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "denver-tree-inventory",
  featureServerUrl: "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_PARK_TREEINVENTORY_P/FeatureServer/241",
  name: "Denver Parks, Medians, and Parkway Trees",
  description:
    "Denver Parks and Recreation's inventory of trees (and vacant plantable sites) in parks, medians, and parkways, including species, condition, and pest/disease flags.",
  mapColor: "#3f7d3a",
  categoryField: "SPECIES_COMMON",
  fields: [
    { name: "SPECIES_COMMON", type: "esriFieldTypeString", description: "Common species name, e.g. 'Pear, Flowering', 'Crabapple', 'Spruce, Blue', or '_Vacant Site' for an empty plantable spot", facetable: true },
    { name: "SPECIES_BOTANIC", type: "esriFieldTypeString", description: "Scientific (Latin) species name" },
    { name: "CONDITION", type: "esriFieldTypeString", description: "Tree condition rating, e.g. 'Good', 'Fair', 'Poor', 'N/A' for vacant sites", facetable: true },
    { name: "DIAMETER", type: "esriFieldTypeString", description: "Trunk diameter" },
    { name: "NEIGHBOR", type: "esriFieldTypeString", description: "Neighborhood name, e.g. 'Skyland'", facetable: true },
    { name: "LOCATION_NAME", type: "esriFieldTypeString", description: "Name of the park, median, or parkway the tree is in" },
    { name: "DISEASE_PEST_DEF", type: "esriFieldTypeString", description: "Disease or pest deficiency noted on the tree, if any" },
    { name: "ADDRESS", type: "esriFieldTypeString", description: "Nearest street address" },
  ],
  exemplars: [
    {
      question: "Trees in poor condition in Denver",
      query: { where: "CONDITION = 'Poor'" },
    },
    {
      question: "Flowering pears in the Skyland neighborhood of Denver",
      query: { where: "SPECIES_COMMON = 'Pear, Flowering' AND NEIGHBOR = 'Skyland'" },
    },
    {
      question: "Vacant tree planting sites in Denver",
      query: { where: "SPECIES_COMMON = '_Vacant Site'" },
    },
    {
      question: "Crabapples in fair condition in Denver",
      query: { where: "SPECIES_COMMON = 'Crabapple' AND CONDITION = 'Fair'" },
    },
    {
      question: "Trees near downtown Denver",
      query: {
        where: "1=1",
        minLat: 39.744,
        maxLat: 39.754,
        minLon: -104.995,
        maxLon: -104.985,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
