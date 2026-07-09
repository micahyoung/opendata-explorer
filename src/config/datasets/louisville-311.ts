import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "louisville-311",
  featureServerUrl: "https://services1.arcgis.com/79kfd2K6fskCAkyg/arcgis/rest/services/metro_311_2026/FeatureServer/0",
  name: "Louisville Metro 311 Service Requests",
  description:
    "Louisville Metro's current-year 311 service requests, covering solid waste, streets, parking, animal issues, zoning, and other non-emergency city service issues. Prior years are archived in separate yearly services not covered here.",
  mapColor: "#c1440e",
  categoryField: "service_name",
  fields: [
    { name: "service_request_id", type: "esriFieldTypeString", description: "Unique identifier for the request" },
    {
      name: "service_name",
      type: "esriFieldTypeString",
      description:
        "Type of service requested, e.g. 'Solid Waste Missed Services', 'Animal Issue', 'Streets', 'Parking Concern', 'Vehicle on Private Property', 'Zoning Concern'",
      facetable: true,
    },
    { name: "status_description", type: "esriFieldTypeString", description: "Current status of the request: 'OPEN' or 'CLOSED'", facetable: true },
    { name: "agency_responsible", type: "esriFieldTypeString", description: "Agency handling the request", facetable: true },
    { name: "address", type: "esriFieldTypeString", description: "Address where the service was requested" },
    { name: "zip_code", type: "esriFieldTypeString", description: "ZIP code of the request location", facetable: true },
    { name: "council_district", type: "esriFieldTypeString", description: "Metro council district number" },
    { name: "requested_datetime", type: "esriFieldTypeDate", description: "Date/time the request was created" },
    { name: "closed_date", type: "esriFieldTypeDate", description: "Date/time the request was closed" },
  ],
  exemplars: [
    {
      question: "Missed solid waste pickups in Louisville",
      query: { where: "service_name = 'Solid Waste Missed Services'" },
    },
    {
      question: "Open animal issue requests in Louisville",
      query: { where: "service_name = 'Animal Issue' AND status_description = 'OPEN'" },
    },
    {
      question: "Parking concerns in Louisville council district 6",
      query: { where: "service_name = 'Parking Concern' AND council_district = '6'" },
    },
    {
      question: "Zoning concern requests in Louisville",
      query: { where: "service_name = 'Zoning Concern'" },
    },
    {
      question: "311 requests near downtown Louisville",
      query: {
        where: "1=1",
        minLat: 38.245,
        maxLat: 38.26,
        minLon: -85.775,
        maxLon: -85.745,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
