import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "philadelphia-tree-inventory",
  featureServerUrl: "https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/ppr_tree_inventory_2025/FeatureServer/0",
  name: "Philadelphia PPR Tree Inventory 2025",
  description:
    "Philadelphia Parks & Recreation's 2025 inventory of trees on PPR-maintained land, with species and trunk diameter. This layer is minimal: only species name, trunk diameter, and inventory year are recorded, with no condition, neighborhood, or address fields.",
  mapColor: "#4a7c3f",
  categoryField: "tree_name",
  fields: [
    {
      name: "tree_name",
      type: "esriFieldTypeString",
      description:
        "Combined Latin and common species name in the format 'LATIN NAME - COMMON NAME', e.g. 'ACER RUBRUM - RED MAPLE', 'UNKNOWN UNKNOWN - UNKNOWN'. Match against the common-name portion with LIKE, e.g. LIKE '%RED MAPLE%'.",
      facetable: true,
    },
    { name: "tree_dbh", type: "esriFieldTypeDouble", description: "Trunk diameter at breast height, in inches" },
    { name: "year", type: "esriFieldTypeString", description: "Inventory year this record was collected in; this dataset is the 2025 snapshot" },
  ],
  exemplars: [
    {
      question: "Red maple trees in Philadelphia",
      query: { where: "tree_name LIKE '%RED MAPLE%'" },
    },
    {
      question: "Large trees over 24 inches DBH in Philadelphia",
      query: { where: "tree_dbh > 24" },
    },
    {
      question: "Trees with unknown species in Philadelphia",
      query: { where: "tree_name LIKE '%UNKNOWN%'" },
    },
    {
      question: "Trees inventoried in 2025 in Philadelphia",
      query: { where: "year = '2025'" },
    },
    {
      question: "Trees near Center City Philadelphia",
      query: {
        where: "1=1",
        minLat: 39.945,
        maxLat: 39.955,
        minLon: -75.17,
        maxLon: -75.16,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
