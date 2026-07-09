import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "denver-public-schools",
  featureServerUrl: "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_EDU_PUBLICSCHOOLS_P/FeatureServer/258",
  name: "Denver Public Schools",
  description:
    "Locations of Denver's public schools for the current school year, including both district-run and charter schools within Denver County 1 (DPS).",
  mapColor: "#c98a1f",
  categoryField: "SCHOOL_LEVEL",
  fields: [
    { name: "SCHOOL_NAME", type: "esriFieldTypeString", description: "Name of the school" },
    { name: "SCHOOL_TYPE", type: "esriFieldTypeString", description: "'District' (traditional DPS-run) or 'Charter'", facetable: true },
    { name: "SCHOOL_LEVEL", type: "esriFieldTypeString", description: "School level, e.g. 'Elementary', 'Middle', 'High'", facetable: true },
    { name: "GRADE_LEVELS", type: "esriFieldTypeString", description: "Grade range served, e.g. '9-12', '6-8'" },
    { name: "SCHOOL_DISTRICT", type: "esriFieldTypeString", description: "School district name, e.g. 'Denver County 1 (DPS)'", facetable: true },
    { name: "ADDRESS_LINE1", type: "esriFieldTypeString", description: "Street address of the school" },
    { name: "ZIP", type: "esriFieldTypeString", description: "ZIP code of the school" },
  ],
  exemplars: [
    {
      question: "High schools in Denver",
      query: { where: "SCHOOL_LEVEL = 'High'" },
    },
    {
      question: "Charter schools in Denver",
      query: { where: "SCHOOL_TYPE = 'Charter'" },
    },
    {
      question: "District-run middle schools in Denver",
      query: { where: "SCHOOL_TYPE = 'District' AND SCHOOL_LEVEL = 'Middle'" },
    },
    {
      question: "Denver public schools serving grades 9-12",
      query: { where: "GRADE_LEVELS = '9-12'" },
    },
    {
      question: "Denver public schools near downtown",
      query: {
        where: "1=1",
        minLat: 39.744,
        maxLat: 39.754,
        minLon: -104.995,
        maxLon: -104.985,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
