import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "sacramento-street-trees",
  featureServerUrl: "https://services5.arcgis.com/54falWtcpty3V47Z/arcgis/rest/services/City_Maintained_Trees/FeatureServer/0",
  name: "Sacramento City Maintained Trees",
  description:
    "City of Sacramento's inventory of city-maintained trees, including species, land use context, planting location type, and overhead utility conflict status.",
  mapColor: "#4f8a3d",
  categoryField: "SPECIES",
  fields: [
    { name: "SPECIES", type: "esriFieldTypeString", description: "Common species name, e.g. 'ash, Modesto', 'London plane tree', 'Chinese tallowtree'", facetable: true },
    { name: "BOTANICAL", type: "esriFieldTypeString", description: "Botanical (scientific) name of the species" },
    { name: "LANDUSE", type: "esriFieldTypeString", description: "Surrounding land use, e.g. 'Single Family Residential', 'Park', 'Golf Course', 'Vacant'", facetable: true },
    { name: "PLANTTYPE", type: "esriFieldTypeString", description: "Type of planting location, e.g. 'Front Yard', 'Median', 'Planter Strip', 'Tree Well'", facetable: true },
    { name: "CONDUCTOR", type: "esriFieldTypeString", description: "Overhead utility conductor conflict status, e.g. 'Present - Future conflict', 'Present - No conflict', 'Not Present'", facetable: true },
    { name: "GROWSPACE", type: "esriFieldTypeString", description: "Width of the tree's growing space, e.g. '3ft', '4x4', '6ft+'" },
    { name: "DBH", type: "esriFieldTypeString", description: "Diameter at breast height range in inches, e.g. '0 to 3', '13 to 18', '49+'" },
    { name: "STREET", type: "esriFieldTypeString", description: "Street the tree is on" },
    { name: "ADDRESS_NUMBER", type: "esriFieldTypeString", description: "Street address number nearest the tree" },
  ],
  exemplars: [
    {
      question: "Modesto ash trees in Sacramento",
      query: { where: "SPECIES = 'ash, Modesto'" },
    },
    {
      question: "Sacramento trees with a future utility conductor conflict",
      query: { where: "CONDUCTOR = 'Present - Future conflict'" },
    },
    {
      question: "Trees in Sacramento parks",
      query: { where: "LANDUSE = 'Park'" },
    },
    {
      question: "Sacramento trees planted in medians",
      query: { where: "PLANTTYPE = 'Median'" },
    },
    {
      question: "Trees near downtown Sacramento",
      query: {
        where: "1=1",
        minLat: 38.575,
        maxLat: 38.585,
        minLon: -121.5,
        maxLon: -121.485,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
