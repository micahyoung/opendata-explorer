import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "cleveland-311",
  featureServerUrl: "https://services3.arcgis.com/dty2kHktVXHrqO8i/arcgis/rest/services/Data_311/FeatureServer/0",
  name: "Cleveland 311 Service Requests",
  description:
    "City of Cleveland 311 service requests since 2/29/2024, covering trash/recycling, illegal dumping, tree service, vacant property, and other non-emergency city service issues. Requests prior to that date are archived in a separate service not covered here.",
  mapColor: "#2e7d32",
  categoryField: "service_name",
  fields: [
    { name: "service_request_id", type: "esriFieldTypeString", description: "Unique identifier for the request" },
    {
      name: "service_category",
      type: "esriFieldTypeString",
      description:
        "Broad category of the request, e.g. 'Trash & Recycling', 'Illegal Dumping', 'Trees', 'Vacant Property', 'Street Issues', 'Building & Housing'",
      facetable: true,
    },
    {
      name: "service_name",
      type: "esriFieldTypeString",
      description:
        "Specific type of service requested, e.g. 'Missed Refuse pick up', 'Illegal Dumping', 'Fallen Trees', 'Pothole Repair', 'Vacant Property'",
      facetable: true,
    },
    { name: "status_description", type: "esriFieldTypeString", description: "Current status of the request: 'Open' or 'Closed'", facetable: true },
    { name: "agency_responsible", type: "esriFieldTypeString", description: "Agency handling the request", facetable: true },
    { name: "division_responsible", type: "esriFieldTypeString", description: "Division within the agency handling the request" },
    { name: "address", type: "esriFieldTypeString", description: "Address where the service was requested" },
    { name: "neighborhood", type: "esriFieldTypeString", description: "Cleveland neighborhood name, e.g. 'Ohio City', 'Glenville', 'Old Brooklyn'", facetable: true },
    { name: "ward_name", type: "esriFieldTypeString", description: "City council ward name" },
    { name: "requested_datetime", type: "esriFieldTypeDate", description: "Date/time the request was created" },
    { name: "closed_date", type: "esriFieldTypeDate", description: "Date/time the request was closed" },
  ],
  exemplars: [
    {
      question: "Illegal dumping complaints in Cleveland",
      query: { where: "service_name = 'Illegal Dumping'" },
    },
    {
      question: "Open fallen tree requests in Cleveland",
      query: { where: "service_name = 'Fallen Trees' AND status_description = 'Open'" },
    },
    {
      question: "Trash and recycling requests in Cleveland's Ohio City neighborhood",
      query: { where: "service_category = 'Trash & Recycling' AND neighborhood = 'Ohio City'" },
    },
    {
      question: "Vacant property complaints in Cleveland",
      query: { where: "service_category = 'Vacant Property'" },
    },
    {
      question: "311 requests near downtown Cleveland",
      query: {
        where: "1=1",
        minLat: 41.49,
        maxLat: 41.505,
        minLon: -81.705,
        maxLon: -81.685,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
