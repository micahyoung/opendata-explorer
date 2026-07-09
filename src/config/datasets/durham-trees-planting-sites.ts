import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "durham-trees-planting-sites",
  featureServerUrl: "https://services2.arcgis.com/G5vR3cOjh6g2Ed8E/arcgis/rest/services/Trees_and_Planting_Sites/FeatureServer/11",
  name: "Durham Trees & Planting Sites",
  description:
    "City and County of Durham's inventory of both existing street trees and designated empty planting sites, including species, condition, and neighborhood.",
  mapColor: "#9c6b30",
  categoryField: "commonname",
  fields: [
    { name: "present", type: "esriFieldTypeString", description: "Whether this row is an existing tree or an empty site: 'Tree', 'Planting Site', or 'Do Not Plant'", facetable: true },
    { name: "genus", type: "esriFieldTypeString", description: "Genus of the tree, e.g. 'Quercus', 'Acer' (empty for planting sites)" },
    { name: "commonname", type: "esriFieldTypeString", description: "Common species name, e.g. 'Willow Oak', 'Red Maple', 'Eastern Redbud' (empty for planting sites)", facetable: true },
    { name: "condition", type: "esriFieldTypeString", description: "Tree condition rating: 'Fair', 'Good', or 'Poor'", facetable: true },
    { name: "diameterin", type: "esriFieldTypeDouble", description: "Trunk diameter in inches" },
    { name: "streetaddress", type: "esriFieldTypeString", description: "Nearest street address" },
    { name: "neighborhood", type: "esriFieldTypeString", description: "Neighborhood name, e.g. 'Old East Durham', 'Downtown', 'Walltown'", facetable: true },
    { name: "plantingdate", type: "esriFieldTypeString", description: "Year the tree was planted" },
  ],
  exemplars: [
    {
      question: "Empty tree planting sites in Durham",
      query: { where: "present = 'Planting Site'" },
    },
    {
      question: "Willow oaks in poor condition in Durham",
      query: { where: "commonname = 'Willow Oak' AND condition = 'Poor'" },
    },
    {
      question: "Trees in the Old East Durham neighborhood",
      query: { where: "present = 'Tree' AND neighborhood = 'Old East Durham'" },
    },
    {
      question: "Trees near downtown Durham",
      query: {
        where: "present = 'Tree'",
        minLat: 35.9914,
        maxLat: 36.0114,
        minLon: -78.9482,
        maxLon: -78.9282,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
