import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "seattle-sdot-trees",
  featureServerUrl:
    "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/SDOT_Trees_CDL/FeatureServer/0",
  name: "Seattle SDOT Tree Inventory",
  description:
    "Seattle Department of Transportation's comprehensive tree inventory, including species, condition rating, ownership, heritage/exceptional status, and planting space details.",
  mapColor: "#1a7a5c",
  categoryField: "COMMON_NAME",
  fields: [
    { name: "COMMON_NAME", type: "esriFieldTypeString", description: "Common species name, e.g. 'Littleleaf Linden', 'American Sycamore', 'Katsura Tree'", facetable: true },
    { name: "BOTANICAL_NAME", type: "esriFieldTypeString", description: "Scientific abbreviation code, e.g. 'TICO' (Tilia americana), 'CEJA' (Cercidiphyllum japonicum)" },
    { name: "GENUS", type: "esriFieldTypeString", description: "Genus name" },
    { name: "CONDITION_RATING", type: "esriFieldTypeString", description: "Tree condition rating from 1 (poor) to 5 (excellent)", facetable: true },
    { name: "CONDITION", type: "esriFieldTypeString", description: "Overall condition assessment" },
    { name: "CURRENT_STATUS", type: "esriFieldTypeString", description: "Current status: 'INSVC' (in service) or 'REMOVED'", facetable: true },
    { name: "OWNERSHIP", type: "esriFieldTypeString", description: "Ownership: 'PRIV' (private/street right-of-way), 'PARK', 'SDOT', 'SEAC'", facetable: true },
    { name: "SPACETYPE", type: "esriFieldTypeString", description: "Planting space surface type: 'SOIL', 'GRAVEL', 'GRASS', 'BRICK', 'PAVERS', 'BARK', 'CGRATE', 'GRATE', 'MULCH', 'OTHER'", facetable: true },
    { name: "DIAM", type: "esriFieldTypeInteger", description: "Trunk diameter at breast height, in inches" },
    { name: "GROWSPACE", type: "esriFieldTypeInteger", description: "Width of available growing space, in feet" },
    { name: "TREEHEIGHT", type: "esriFieldTypeInteger", description: "Tree height in feet" },
    { name: "HERITAGE", type: "esriFieldTypeString", description: "Heritage tree designation: 'Y' or 'N'" },
    { name: "EXCEPTIONAL", type: "esriFieldTypeString", description: "Exceptional tree designation: 'Y' or 'N'" },
    { name: "GREEN_FACTOR", type: "esriFieldTypeString", description: "Green Factor score — SDOT metric for green infrastructure value" },
    { name: "WIRES", type: "esriFieldTypeString", description: "Overhead wire proximity/conflict status" },
    { name: "SITETYPE", type: "esriFieldTypeString", description: "Type of planting site, e.g. 'PIT' (tree pit)" },
    { name: "LAST_VERIFY_DATE", type: "esriFieldTypeDate", description: "Date the tree was last verified in the field" },
    { name: "PLANTED_DATE", type: "esriFieldTypeDate", description: "Date the tree was planted" },
  ],
  exemplars: [
    {
      question: "Trees in service on private right-of-way in Seattle",
      query: { where: "CURRENT_STATUS = 'INSVC' AND OWNERSHIP = 'PRIV'" },
    },
    {
      question: "Excellent condition trees in Seattle",
      query: { where: "CONDITION_RATING = '5'" },
    },
    {
      question: "Trees with soil planting space in Seattle",
      query: { where: "SPACETYPE = 'SOIL'" },
    },
    {
      question: "Heritage trees in Seattle",
      query: { where: "HERITAGE = 'Y'" },
    },
    {
      question: "Trees near Capitol Hill in Seattle",
      query: {
        where: "1=1",
        minLat: 47.620,
        maxLat: 47.635,
        minLon: -122.320,
        maxLon: -122.310,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
