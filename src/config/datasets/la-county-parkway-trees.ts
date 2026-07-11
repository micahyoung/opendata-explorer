import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "la-county-parkway-trees",
  featureServerUrl:
    "https://services.arcgis.com/RmCCgQtiZLDCtblq/arcgis/rest/services/Public_Works_Road_Maintenance_Division_Tree_Inventory_(Public_View)/FeatureServer/0",
  name: "LA County DPW Parkway Tree Inventory",
  description:
    "Road Maintenance Division parkway tree inventory for Los Angeles County, maintained by LA County Public Works. Covers trees along county roadways with species, DBH, height, and status information.",
  mapColor: "#5a9e42",
  categoryField: "COMMON_editable",
  fields: [
    { name: "OBJECTID", type: "esriFieldTypeOID", description: "Unique feature ID" },
    {
      name: "COMMON_editable",
      type: "esriFieldTypeString",
      description:
        "Common tree species name, e.g. 'CHINESE ELM', 'LONDON PLANE', 'PEACOCK PALM'. Values are uppercased. Coded value domain with 100+ species.",
      facetable: true,
    },
    { name: "SCIENTIFIC_NAME", type: "esriFieldTypeString", description: "Scientific (Latin) species name" },
    { name: "EXACT_DBH", type: "esriFieldTypeDouble", description: "Trunk diameter in inches, measured at breast height (DBH)" },
    { name: "EXACT_HEIG", type: "esriFieldTypeDouble", description: "Tree height in feet" },
    { name: "CROWN", type: "esriFieldTypeDouble", description: "Crown spread in feet" },
    {
      name: "Status",
      type: "esriFieldTypeString",
      description: "Tree status, e.g. 'Active', 'Removed'",
      facetable: true,
    },
    { name: "ADDRESS", type: "esriFieldTypeDouble", description: "Street address number" },
    { name: "PROPSTREET", type: "esriFieldTypeString", description: "Street name" },
    { name: "SIDE", type: "esriFieldTypeString", description: "Street side (e.g. 'N', 'S', 'E', 'W')" },
    { name: "SITE", type: "esriFieldTypeDouble", description: "Site distance or identifier" },
    { name: "Area", type: "esriFieldTypeString", description: "Geographic area designation", facetable: true },
    { name: "RD", type: "esriFieldTypeInteger", description: "Road District number" },
    { name: "MD", type: "esriFieldTypeInteger", description: "Maintenance District number" },
    { name: "SD", type: "esriFieldTypeString", description: "Sub-district (2021)" },
    { name: "COMMUNITY", type: "esriFieldTypeString", description: "Community name" },
    { name: "CW_ASSETID", type: "esriFieldTypeString", description: "CityWorks asset management ID" },
  ],
  exemplars: [
    {
      question: "Active London Plane trees in LA County",
      query: { where: "COMMON_editable = 'LONDON PLANE' AND Status = 'Active'" },
    },
    {
      question: "Chinese Elm trees in LA County",
      query: { where: "COMMON_editable = 'CHINESE ELM'" },
    },
    {
      question: "Large trees with DBH over 24 inches in LA County",
      query: { where: "EXACT_DBH > 24" },
    },
    {
      question: "Active palm trees in LA County",
      query: { where: "COMMON_editable like '%PALM%' AND Status = 'Active'" },
    },
    {
      question: "Trees in the Downtown LA area",
      query: {
        where: "Status = 'Active'",
        minLat: 34.035,
        maxLat: 34.055,
        minLon: -118.255,
        maxLon: -118.235,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
