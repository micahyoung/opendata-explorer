import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "baltimore-311-service-requests",
  featureServerUrl: "https://services1.arcgis.com/UWYHeuuJISiGmgXx/arcgis/rest/services/311_Customer_Service_Requests_current/FeatureServer/0",
  name: "Baltimore 311 Customer Service Requests",
  description:
    "Baltimore's current-year 311 service requests, covering solid waste, water/wastewater, forestry, and other non-emergency city service issues. Prior years are archived in a separate yearly service not covered here.",
  mapColor: "#4c6b8a",
  categoryField: "SRType",
  fields: [
    { name: "SRType", type: "esriFieldTypeString", description: "Type of service requested, e.g. 'SW-Cleaning', 'SW-Dirty Alley', 'FOR-Tree Maintenance', 'WW-Water Leak (Exterior)'", facetable: true },
    { name: "SRStatus", type: "esriFieldTypeString", description: "Current status of the request, e.g. 'Open', 'Closed'", facetable: true },
    {
      name: "Agency",
      type: "esriFieldTypeString",
      description:
        "Agency handling the request, fixed-width and right-padded with spaces -- always match with LIKE and a trailing '%', e.g. LIKE 'Solid Waste%'. Values include 'Solid Waste', 'Recreation & Parks', 'Water Wastewater', 'ECC'",
      facetable: true,
    },
    { name: "Neighborhood", type: "esriFieldTypeString", description: "Baltimore neighborhood name, e.g. 'Mount Vernon', 'Charles Village', 'Belair-Edison' (often empty)", facetable: true },
    { name: "CouncilDistrict", type: "esriFieldTypeString", description: "City council district number" },
    { name: "Address", type: "esriFieldTypeString", description: "Address where the service was requested" },
    { name: "CreatedDate", type: "esriFieldTypeDate", description: "Date/time the request was created" },
    { name: "CloseDate", type: "esriFieldTypeDate", description: "Date/time the request was closed" },
  ],
  exemplars: [
    {
      question: "Dirty alley complaints in Baltimore",
      query: { where: "SRType = 'SW-Dirty Alley'" },
    },
    {
      question: "Open tree maintenance requests in Baltimore",
      query: { where: "SRType = 'FOR-Tree Maintenance' AND SRStatus = 'Open'" },
    },
    {
      question: "Solid waste requests in the Belair-Edison neighborhood of Baltimore",
      query: { where: "Agency LIKE 'Solid Waste%' AND Neighborhood = 'Belair-Edison'" },
    },
    {
      question: "Water leak requests in Baltimore",
      query: { where: "SRType = 'WW-Water Leak (Exterior)'" },
    },
    {
      question: "311 requests near downtown Baltimore",
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
