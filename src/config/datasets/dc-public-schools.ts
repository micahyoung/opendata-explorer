import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "dc-public-schools",
  featureServerUrl: "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Education_WebMercator/MapServer/5",
  name: "DC Public Schools (DCPS)",
  description:
    "Locations of District of Columbia Public Schools (DCPS) campuses, with grade level, enrollment, and building details. Does not include public charter schools, which are tracked separately.",
  mapColor: "#c98a1f",
  categoryField: "LEVEL_",
  fields: [
    { name: "NAME", type: "esriFieldTypeString", description: "Name of the school" },
    { name: "ADDRESS", type: "esriFieldTypeString", description: "Street address of the school" },
    { name: "LEVEL_", type: "esriFieldTypeString", description: "School level: 'ES' (elementary), 'MS' (middle), 'HS' (high school), 'EC' (education campus)", facetable: true },
    { name: "STATUS", type: "esriFieldTypeString", description: "Operating status of the school, e.g. 'Active'", facetable: true },
    { name: "GRADES", type: "esriFieldTypeString", description: "Grade range served, e.g. 'PK4-5th', '6th-8th', '9th-12th'" },
    { name: "TOTAL_STUD", type: "esriFieldTypeDouble", description: "Total enrolled student count" },
    { name: "CAPACITY", type: "esriFieldTypeDouble", description: "Building capacity" },
    { name: "YEAR_BUILT", type: "esriFieldTypeDouble", description: "Year the school building was built" },
  ],
  exemplars: [
    {
      question: "Elementary schools in DC",
      query: { where: "LEVEL_ = 'ES'" },
    },
    {
      question: "Middle schools with more than 300 students in DC",
      query: { where: "LEVEL_ = 'MS' AND TOTAL_STUD > 300" },
    },
    {
      question: "Active high schools in DC",
      query: { where: "LEVEL_ = 'HS' AND STATUS = 'Active'" },
    },
    {
      question: "DC public schools built before 1960",
      query: { where: "YEAR_BUILT > 0 AND YEAR_BUILT < 1960" },
    },
    {
      question: "DC public schools near downtown",
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
