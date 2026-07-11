import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "portland-street-trees",
  featureServerUrl:
    "https://services.arcgis.com/quVN97tn06YNGj9s/arcgis/rest/services/Street_Tree_Inventory_Second_Edition_2024/FeatureServer/297",
  name: "Portland Street Tree Inventory 2024",
  description:
    "Portland Parks & Recreation's second-edition 2024 inventory of street trees, including species, condition, neighborhood, functional type, native status, and planting site details.",
  mapColor: "#2d7a4f",
  categoryField: "SPECIES_COMMON_NAME",
  fields: [
    { name: "SPECIES_COMMON_NAME", type: "esriFieldTypeString", description: "Common species name, e.g. 'Japanese flowering cherry', 'dogwood', 'London planetree'", facetable: true },
    { name: "SPECIES_SCIENTIFIC_NAME", type: "esriFieldTypeString", description: "Scientific (Latin) species name" },
    { name: "GENUS", type: "esriFieldTypeString", description: "Genus name" },
    { name: "FAMILY", type: "esriFieldTypeString", description: "Plant family name" },
    { name: "FUNCTIONAL_TYPE", type: "esriFieldTypeString", description: "Tree type: 'Broadleaf Deciduous', 'Broadleaf Evergreen', 'Coniferous Evergreen', 'Unknown - Dead'", facetable: true },
    { name: "CONDITION", type: "esriFieldTypeString", description: "Tree condition: 'Good', 'Fair', 'Poor', 'Dead'", facetable: true },
    { name: "NATIVE", type: "esriFieldTypeString", description: "Whether the species is native to the region: 'Yes' or 'No'", facetable: true },
    { name: "NEIGHBORHOOD", type: "esriFieldTypeString", description: "Portland neighborhood name, e.g. 'CONCORDIA', 'PEARL DISTRICT'", facetable: true },
    { name: "DBH_GROUP_RANGE", type: "esriFieldTypeString", description: "Trunk diameter at breast height range in inches, e.g. '6.1 - 12', '> 24'" },
    { name: "DBH_IE_DIAMETER", type: "esriFieldTypeSingle", description: "Exact trunk diameter at breast height in inches" },
    { name: "MATURE_SIZE", type: "esriFieldTypeString", description: "Expected mature size category, e.g. 'Small', 'Medium', 'Large'" },
    { name: "PLANTING_SITE_TYPE", type: "esriFieldTypeString", description: "Type of planting location: 'Strip', 'Cutout', 'No curb - no sidewalk', 'Other'", facetable: true },
    { name: "PLANTING_SITE_SIZE", type: "esriFieldTypeString", description: "Size of the planting site, e.g. 'Small', 'Medium', 'Large'" },
    { name: "OVERHEAD_WIRES", type: "esriFieldTypeString", description: "Overhead utility wire proximity/conflict status" },
    { name: "NUISANCE", type: "esriFieldTypeString", description: "Whether the tree has nuisance characteristics" },
    { name: "ADDRESS", type: "esriFieldTypeString", description: "Nearest street address" },
    { name: "DATE_INVENTORIED", type: "esriFieldTypeDate", description: "Date this tree was inventoried" },
  ],
  exemplars: [
    {
      question: "Dead trees in Portland",
      query: { where: "CONDITION = 'Dead'" },
    },
    {
      question: "Native trees in Portland",
      query: { where: "NATIVE = 'Yes'" },
    },
    {
      question: "Broadleaf evergreen trees in Portland",
      query: { where: "FUNCTIONAL_TYPE = 'Broadleaf Evergreen'" },
    },
    {
      question: "Trees in poor condition in Portland",
      query: { where: "CONDITION = 'Poor'" },
    },
    {
      question: "Trees near downtown Portland",
      query: {
        where: "1=1",
        minLat: 45.518,
        maxLat: 45.528,
        minLon: -122.685,
        maxLon: -122.670,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
