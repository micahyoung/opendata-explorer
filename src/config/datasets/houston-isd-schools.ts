import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "houston-isd-schools",
  featureServerUrl:
    "https://services3.arcgis.com/zmk8NL9pBXO4ybJQ/arcgis/rest/services/Socioeconomic_Influence_on_School_Performance_in_Houston_ISD/FeatureServer/9",
  name: "Houston ISD Schools by Rating",
  description:
    "Public school campuses operated by Houston ISD, with school type, grades served, enrollment, TEA rating, economically disadvantaged percentage, and EB/EL student percentage.",
  mapColor: "#2f6f99",
  categoryField: "USER_School_Type",
  fields: [
    { name: "USER_School_Type", type: "esriFieldTypeString", description: "School type: 'Elementary', 'Middle School', 'High School', 'Elem/Secondary'", facetable: true },
    { name: "USER_Campus_Name", type: "esriFieldTypeString", description: "Name of the campus" },
    { name: "IN_Address", type: "esriFieldTypeString", description: "Street address of the campus" },
    { name: "USER_Zip_Code", type: "esriFieldTypeDouble", description: "ZIP code of the campus" },
    { name: "USER_Grades_Served", type: "esriFieldTypeString", description: "Grades served, e.g. 'PK - 06', '07 - 08', '09 - 12'" },
    { name: "USER_Number_of_Students", type: "esriFieldTypeDouble", description: "Total number of students enrolled" },
    { name: "USER_F__Economically_Disadvanta", type: "esriFieldTypeDouble", description: "Percentage of economically disadvantaged students" },
    { name: "USER_F__EB_EL_Students", type: "esriFieldTypeDouble", description: "Percentage of English Learner / Emergent Bilingual students" },
    { name: "USER_Rating", type: "esriFieldTypeString", description: "Texas Education Agency accountability letter grade, e.g. 'A', 'B', 'C', 'I'", facetable: true },
    { name: "Loc_name", type: "esriFieldTypeString", description: "Campus location designation", facetable: true },
  ],
  exemplars: [
    {
      question: "Elementary schools in Houston ISD",
      query: { where: "USER_School_Type = 'Elementary'" },
    },
    {
      question: "A-rated Houston ISD schools",
      query: { where: "USER_Rating = 'A'" },
    },
    {
      question: "Houston ISD high schools",
      query: { where: "USER_School_Type = 'High School'" },
    },
    {
      question: "Houston ISD schools with over 1000 students",
      query: { where: "USER_Number_of_Students > 1000" },
    },
    {
      question: "Houston ISD schools near downtown Houston",
      query: {
        where: "1=1",
        minLat: 29.745,
        maxLat: 29.775,
        minLon: -95.375,
        maxLon: -95.355,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
