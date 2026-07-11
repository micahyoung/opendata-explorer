import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "jcys-68y7",
  domain: "citydata.mesaaz.gov",
  name: "Mesa Tree Inventory",
  description:
    "City of Mesa, Arizona's inventory of city-maintained trees and vegetation, including species, DBH, height, owner department, and location.",
  geo: { mode: "native", field: "geolocation_2" },
  mapColor: "#c2703a",
  categoryField: "common_name",
  fields: [
    { name: "facilityid", type: "text", description: "Unique facility identifier, e.g. 'TSTR24929'" },
    { name: "common_name", type: "text", description: "Common species name, e.g. 'Southern Live Oak', 'Blue Palo Verde', 'Canary Island Date Palm'", facetable: true },
    { name: "botanical_name", type: "text", description: "Scientific (Latin) species name, e.g. 'Quercus virginiana', 'Cercidium floridum'" },
    { name: "veg_category", type: "text", description: "Vegetation category: 'Tree', 'Shrub', 'Cactus', 'Groundcover', 'Accent'", facetable: true },
    { name: "tree_dbh", type: "text", description: "Trunk diameter at breast height range in inches: '0-6', '07-12', '13-18', '19-24', '25-30', '31+'", facetable: true },
    { name: "veg_height", type: "text", description: "Vegetation height range in feet: '01-15', '15-30', '30-45', '45-60', '60+'" },
    { name: "isactive", type: "text", description: "Whether the record is active: '1' (active)" },
    { name: "owner", type: "text", description: "Responsible department: 'COM Trans' (Community Transportation), 'Parks', 'Facilities', 'COM Transit'", facetable: true },
    { name: "location", type: "text", description: "Street location description, e.g. 'WARNER RD ~ MOUNTAIN RD (EFC) - MERIDIAN RD'" },
    { name: "latitude", type: "number", description: "Latitude of the vegetation location" },
    { name: "longitude", type: "number", description: "Longitude of the vegetation location" },
    { name: "created_year", type: "text", description: "Year this record was created in the inventory" },
    { name: "action", type: "text", description: "Planned action for the vegetation, e.g. 'None'" },
  ],
  exemplars: [
    {
      question: "Trees maintained by Mesa Community Transportation",
      soql: {
        where: "veg_category = 'Tree' AND owner = 'COM Trans'",
        limit: 1000,
      },
    },
    {
      question: "Large trees (31+ inch DBH) in Mesa",
      soql: {
        where: "tree_dbh = '31+' AND veg_category = 'Tree'",
        limit: 1000,
      },
    },
    {
      question: "Desert vegetation (cacti and shrubs) in Mesa",
      soql: {
        where: "veg_category IN ('Cactus', 'Shrub')",
        limit: 1000,
      },
    },
    {
      question: "Trees managed by Mesa Parks department",
      soql: {
        where: "owner = 'Parks' AND veg_category = 'Tree'",
        limit: 1000,
      },
    },
    {
      question: "Trees near downtown Mesa",
      soql: {
        where: "veg_category = 'Tree' AND latitude between 33.414 AND 33.424 AND longitude between -111.835 AND -111.820",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
