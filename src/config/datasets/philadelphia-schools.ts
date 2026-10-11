import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "philadelphia-schools",
  featureServerUrl:
    "https://services.arcgis.com/fLeGjb7u4uXqeF9q/arcgis/rest/services/Schools/FeatureServer/0",
  name: "Philadelphia Schools",
  description:
    "Point locations of public (School District of Philadelphia), charter, contracted, private and archdiocesan schools in Philadelphia, including some school annexes. Enrollment is only populated for some records.",
  mapColor: "#1f6f8b",
  categoryField: "type_specific",
  fields: [
    { name: "school_name", type: "esriFieldTypeString", description: "Name of the school, in upper case, e.g. 'ST MARYS INTERPAROCHIAL SCHOOL'" },
    { name: "street_address", type: "esriFieldTypeString", description: "Street address of the school, in upper case" },
    { name: "zip_code", type: "esriFieldTypeString", description: "ZIP code of the school, e.g. '19106'" },
    { name: "phone_number", type: "esriFieldTypeString", description: "Phone number of the school" },
    {
      name: "type_specific",
      type: "esriFieldTypeString",
      description: "School operator type: 'DISTRICT', 'CHARTER', 'CONTRACTED', 'PRIVATE', or 'ARCHDIOCESE'",
      facetable: true,
    },
    {
      name: "grade_level",
      type: "esriFieldTypeString",
      description:
        "Grade band, e.g. 'ELEMENTARY', 'MIDDLE SCHOOL', 'HIGH SCHOOL', 'ELEMENTARY/MIDDLE', 'MIDDLE/HIGH', 'PRE-K/KINDERGARTEN', 'SPECIAL CENTER'. Spellings are inconsistent (e.g. 'ELEMENTARY' vs 'ELEMENTARY SCHOOL'), so match with LIKE, e.g. grade_level LIKE 'ELEMENTARY%'",
      facetable: true,
    },
    { name: "grade_org", type: "esriFieldTypeString", description: "Grade span served, e.g. 'K-8', 'PREK-8', '9-12'" },
    { name: "enrollment", type: "esriFieldTypeInteger", description: "Student enrollment (often empty, especially for private and archdiocesan schools)" },
  ],
  exemplars: [
    {
      question: "Charter schools in Philadelphia",
      query: { where: "type_specific = 'CHARTER'" },
    },
    {
      question: "Philadelphia district high schools",
      query: { where: "type_specific = 'DISTRICT' AND grade_level = 'HIGH SCHOOL'" },
    },
    {
      question: "Archdiocese schools in Philadelphia",
      query: { where: "type_specific = 'ARCHDIOCESE'" },
    },
    {
      question: "Largest Philadelphia schools by enrollment",
      query: {
        where: "enrollment IS NOT NULL",
        orderByFields: "enrollment DESC",
        resultRecordCount: 50,
      },
    },
    {
      question: "Private schools in Philadelphia ZIP code 19104",
      query: { where: "type_specific = 'PRIVATE' AND zip_code = '19104'" },
    },
    {
      question: "Schools near Center City Philadelphia",
      query: {
        where: "1=1",
        minLat: 39.94,
        maxLat: 39.96,
        minLon: -75.185,
        maxLon: -75.145,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
