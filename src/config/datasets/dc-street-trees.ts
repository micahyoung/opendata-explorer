import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "dc-street-trees",
  featureServerUrl: "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Urban_Tree_Canopy/MapServer/23",
  name: "DC Urban Forestry Street Trees",
  description:
    "Washington, D.C.'s street tree inventory, maintained by the Urban Forestry Division: species, condition, trunk diameter, and planting/removal history for individual street trees citywide.",
  mapColor: "#5a8f4f",
  categoryField: "CMMN_NM",
  fields: [
    { name: "SCI_NM", type: "esriFieldTypeString", description: "Scientific (Latin) species name" },
    { name: "CMMN_NM", type: "esriFieldTypeString", description: "Common species name, e.g. 'Silver linden', 'Red oak', 'October Glory red maple'", facetable: true },
    { name: "GENUS_NAME", type: "esriFieldTypeString", description: "Genus of the tree, e.g. 'Quercus', 'Acer'", facetable: true },
    { name: "CONDITION", type: "esriFieldTypeString", description: "Tree condition rating, e.g. 'Excellent', 'Good', 'Fair', 'Poor'", facetable: true },
    { name: "DBH", type: "esriFieldTypeDouble", description: "Diameter at breast height, in inches" },
    { name: "WARD", type: "esriFieldTypeSmallInteger", description: "DC ward number the tree is in (1-8)", facetable: true },
    { name: "VICINITY", type: "esriFieldTypeString", description: "Nearest street/address description" },
    { name: "DATE_PLANT", type: "esriFieldTypeDate", description: "Date the tree was planted" },
    { name: "OWNERSHIP", type: "esriFieldTypeString", description: "Owning entity for the tree, e.g. 'UFA' (Urban Forestry Administration, most street trees), 'DPR' (Parks and Recreation), 'DCPS' (public schools), 'Private'", facetable: true },
  ],
  exemplars: [
    {
      question: "Red oaks in DC",
      query: { where: "CMMN_NM = 'Red oak'" },
    },
    {
      question: "Trees in poor condition in Ward 6",
      query: { where: "CONDITION = 'Poor' AND WARD = 6" },
    },
    {
      question: "Silver lindens in excellent condition in DC",
      query: { where: "CMMN_NM = 'Silver linden' AND CONDITION = 'Excellent'" },
    },
    {
      question: "Urban Forestry Administration street trees in DC",
      query: { where: "OWNERSHIP = 'UFA'" },
    },
    {
      question: "Street trees near downtown DC",
      query: {
        where: "1=1",
        minLat: 38.895,
        maxLat: 38.905,
        minLon: -77.045,
        maxLon: -77.02,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
