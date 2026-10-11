import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "nashville-pini-schools",
  featureServerUrl:
    "https://services3.arcgis.com/pXGyp7DHTIE4RXOJ/arcgis/rest/services/PINI_ALL_Points/FeatureServer/0",
  name: "Nashville Public Infrastructure Needs Inventory — School Projects",
  description:
    "Middle Tennessee Public Infrastructure Needs Inventory (PINI) of point projects across eight counties. The layer covers all infrastructure types; school projects are Project_Ty 'New Public Schools' (new construction), 'Existing School Improvements', and 'School-system-wide'. Always include a Project_Ty filter (e.g. LIKE '%School%') for school questions.",
  mapColor: "#256d85",
  categoryField: "Project_Ty",
  fields: [
    { name: "Name", type: "esriFieldTypeString", description: "Project name, usually the school name" },
    { name: "Project_Ty", type: "esriFieldTypeString", description: "Project category. School values: 'New Public Schools', 'Existing School Improvements', 'School-system-wide' (also appears as 'School-System-Wide', so prefer LIKE '%School%'). Other values are non-school infrastructure.", facetable: true },
    { name: "SubType", type: "esriFieldTypeString", description: "Project subtype, e.g. 'Elementary School', 'Middle School', 'High School', 'School System-wide'", facetable: true },
    { name: "Stage", type: "esriFieldTypeString", description: "Project stage: 'Conceptual', 'Planning and Design', 'Construction', 'Completed'", facetable: true },
    { name: "County", type: "esriFieldTypeString", description: "County name, e.g. 'Davidson', 'Williamson', 'Rutherford', 'Sumner', 'Wilson'", facetable: true },
    { name: "Prin_Owner", type: "esriFieldTypeString", description: "Principal owner of the project, e.g. 'Dickson County'" },
    { name: "Descriptio", type: "esriFieldTypeString", description: "Free-text project description" },
    { name: "Location", type: "esriFieldTypeString", description: "Free-text location description" },
    { name: "IY", type: "esriFieldTypeInteger", description: "Inventory year the project was recorded" },
    { name: "Cost", type: "esriFieldTypeDouble", description: "Estimated project cost in US dollars" },
  ],
  exemplars: [
    {
      question: "Planned new schools in Middle Tennessee",
      query: { where: "Project_Ty = 'New Public Schools' AND Stage IN ('Conceptual', 'Planning and Design')" },
    },
    {
      question: "School projects under construction",
      query: { where: "Project_Ty LIKE '%School%' AND Stage = 'Construction'" },
    },
    {
      question: "Improvements to existing schools",
      query: { where: "Project_Ty = 'Existing School Improvements'" },
    },
    {
      question: "School projects in Davidson County",
      query: { where: "Project_Ty LIKE '%School%' AND County = 'Davidson'" },
    },
    {
      question: "School projects near downtown Nashville",
      query: {
        where: "Project_Ty LIKE '%School%'",
        minLat: 36.0,
        maxLat: 36.35,
        minLon: -87.0,
        maxLon: -86.6,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
