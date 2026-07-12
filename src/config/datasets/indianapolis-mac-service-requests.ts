import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "indianapolis-mac-service-requests",
  featureServerUrl: "https://gis.indy.gov/server/rest/services/OpenData/ODP_RIMACServiceRequests/FeatureServer/0",
  name: "Indianapolis MAC Service Requests",
  description:
    "Indianapolis Mayor's Action Center (MAC) service requests via the Request Indy platform — citizen-reported civic issues such as street repair, sidewalk maintenance, high grass, illegal dumping, traffic signals, and abandoned vehicles. Covers both open and closed cases from Phone, Web, and API channels.",
  mapColor: "#6b3fa0",
  categoryField: "SERVICENAME",
  fields: [
    { name: "SERVICEREQUESTID", type: "esriFieldTypeString", description: "Unique identifier for the service request" },
    { name: "SERVICENAME", type: "esriFieldTypeString", description: "Service category, e.g. 'Streets and Alley Repair', 'High Weeds and Grass', 'Illegal Dumping'", facetable: true },
    { name: "ACTIVITY", type: "esriFieldTypeString", description: "Specific activity within the service category, e.g. 'Street Chuckhole', 'Broken Sidewalk or Curb', 'Missed Trash'", facetable: true },
    { name: "SERVICEDEPARTMENT", type: "esriFieldTypeString", description: "Department handling the request, e.g. 'Department of Public Works - Operations'", facetable: true },
    { name: "STATUS", type: "esriFieldTypeString", description: "Current status of the request, e.g. 'open', 'closed'", facetable: true },
    { name: "ORIGIN", type: "esriFieldTypeString", description: "How the request was submitted, e.g. 'Phone', 'Web', 'API', 'Proactive'", facetable: true },
    { name: "ADDRESS", type: "esriFieldTypeString", description: "Street address where the request was made" },
    { name: "COUNCILDISTRICT", type: "esriFieldTypeInteger", description: "City council district number" },
    { name: "ZIPCODE", type: "esriFieldTypeInteger", description: "ZIP code of the request location" },
    { name: "REQUESTEDDATETIME", type: "esriFieldTypeDate", description: "Date/time the request was submitted" },
    { name: "UPDATEDDATETIME", type: "esriFieldTypeDate", description: "Date/time the request was last updated" },
    { name: "CLOSEDDATETIME", type: "esriFieldTypeDate", description: "Date/time the request was closed" },
  ],
  exemplars: [
    {
      question: "Street repair requests in Indianapolis",
      query: { where: "SERVICENAME = 'Streets and Alley Repair'" },
    },
    {
      question: "Open high grass complaints in Indianapolis",
      query: { where: "SERVICENAME = 'High Weeds and Grass' AND STATUS = 'open'" },
    },
    {
      question: "Illegal dumping reports in Indianapolis",
      query: { where: "SERVICENAME = 'Illegal Dumping'" },
    },
    {
      question: "Abandoned vehicle requests on public property",
      query: { where: "SERVICENAME = 'Abandoned Vehicle: Public Property'" },
    },
    {
      question: "Sidewalk and curb maintenance requests submitted via phone",
      query: { where: "SERVICENAME = 'Sidewalk and Curb Maintenance' AND ORIGIN = 'Phone'" },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
