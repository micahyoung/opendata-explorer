import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "baltimore-street-trees",
  featureServerUrl: "https://gis.baltimorecity.gov/egis/rest/services/Foresty/Trees/FeatureServer/0",
  name: "Baltimore Street Trees",
  description:
    "Baltimore Forestry Division's inventory of street trees and vacant planting sites, including species, condition, and neighborhood.",
  mapColor: "#9c6b30",
  categoryField: "COMMON",
  fields: [
    { name: "COMMON", type: "esriFieldTypeString", description: "Common species name, e.g. 'elm, American', 'sassafras', or 'Vacant Site' for an empty plantable spot", facetable: true },
    { name: "GENUS", type: "esriFieldTypeString", description: "Genus of the tree" },
    { name: "CONDITION", type: "esriFieldTypeString", description: "Tree condition, e.g. 'Good', 'Poor', 'Absent' (for vacant sites)", facetable: true },
    { name: "DBH", type: "esriFieldTypeDouble", description: "Diameter at breast height, in inches" },
    { name: "Neighborhood", type: "esriFieldTypeString", description: "Baltimore neighborhood name, e.g. 'Cross Country'", facetable: true },
    { name: "Street", type: "esriFieldTypeString", description: "Street the tree is on" },
    { name: "PLANTINGSTATUS", type: "esriFieldTypeString", description: "Planting status of the site" },
  ],
  exemplars: [
    {
      question: "Trees in poor condition in Baltimore",
      query: { where: "CONDITION = 'Poor'" },
    },
    {
      question: "American elms in the Cross Country neighborhood of Baltimore",
      query: { where: "COMMON = 'elm, American' AND Neighborhood = 'Cross Country'" },
    },
    {
      question: "Vacant tree planting sites in Baltimore",
      query: { where: "COMMON = 'Vacant Site'" },
    },
    {
      question: "Sassafras trees in good condition in Baltimore",
      query: { where: "COMMON = 'sassafras' AND CONDITION = 'Good'" },
    },
    {
      question: "Street trees near downtown Baltimore",
      query: {
        where: "1=1",
        minLat: 39.285,
        maxLat: 39.295,
        minLon: -76.62,
        maxLon: -76.605,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
