import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "raleigh-street-park-trees",
  featureServerUrl:
    "https://services.arcgis.com/v400IkDOw1ad7Yad/arcgis/rest/services/PRCR_Urban_Forestry_Trees_Open_Data/FeatureServer/0",
  name: "Raleigh Street and Park Trees",
  description:
    "A comprehensive inventory of trees in the public right-of-way and in parks across Raleigh, maintained by PRCR Urban Forestry staff, including species, trunk diameter, and location.",
  mapColor: "#5c8a3a",
  categoryField: "SPP_CODE",
  fields: [
    { name: "STREET", type: "esriFieldTypeString", description: "Nearest street name" },
    {
      name: "SPP_CODE",
      type: "esriFieldTypeString",
      description:
        "Coded species abbreviation (not free text), e.g. 'ACRU' for red maple, 'QUPH' for willow oak, 'PITA' for loblolly pine, 'COFL' for flowering dogwood. Match with exact equality against the code, not the common name.",
      facetable: true,
    },
    { name: "DIAMETER", type: "esriFieldTypeInteger", description: "Trunk diameter in inches, measured at breast height (DBH)" },
  ],
  exemplars: [
    {
      question: "Red maples in Raleigh",
      query: { where: "SPP_CODE = 'ACRU'" },
    },
    {
      question: "Willow oaks in Raleigh",
      query: { where: "SPP_CODE = 'QUPH'" },
    },
    {
      question: "Large loblolly pines in Raleigh with a trunk diameter over 24 inches",
      query: { where: "SPP_CODE = 'PITA' AND DIAMETER > 24" },
    },
    {
      question: "Flowering dogwoods near downtown Raleigh",
      query: {
        where: "SPP_CODE = 'COFL'",
        minLat: 35.7696,
        maxLat: 35.7896,
        minLon: -78.6482,
        maxLon: -78.6282,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
