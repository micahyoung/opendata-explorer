import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "dc-311-service-requests",
  featureServerUrl: "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/ServiceRequests/FeatureServer/13",
  name: "DC 311 City Service Requests",
  description:
    "Washington, D.C.'s 311 service request center: requests from the last 90 days such as bulk trash pickup, parking enforcement, tree inspections, and abandoned automobiles, received via the Office of Unified Communications call center, web intake, or mail. Older requests are archived into separate by-year layers not covered here.",
  mapColor: "#4c6b8a",
  categoryField: "SERVICECODEDESCRIPTION",
  fields: [
    { name: "SERVICEREQUESTID", type: "esriFieldTypeString", description: "Unique identifier for the service request" },
    { name: "SERVICECODEDESCRIPTION", type: "esriFieldTypeString", description: "Specific service requested, e.g. 'Bulk Collection', 'Parking Enforcement', 'Tree Inspection'", facetable: true },
    { name: "SERVICETYPECODEDESCRIPTION", type: "esriFieldTypeString", description: "Owning agency division, e.g. 'SWMA- Solid Waste Management Admistration', 'PEMA- Parking Enforcement Management Administration', 'Urban Forrestry'", facetable: true },
    { name: "ORGANIZATIONACRONYM", type: "esriFieldTypeString", description: "Acronym of the agency handling the request, e.g. 'DPW', 'DDOT', 'DOH'", facetable: true },
    { name: "SERVICEORDERSTATUS", type: "esriFieldTypeString", description: "Current status of the request, e.g. 'Closed', 'Open'", facetable: true },
    { name: "PRIORITY", type: "esriFieldTypeString", description: "Priority level of the request, e.g. 'Standard', 'Emergency'", facetable: true },
    { name: "WARD", type: "esriFieldTypeString", description: "DC ward the request is in, e.g. 'Ward 6'", facetable: true },
    { name: "STREETADDRESS", type: "esriFieldTypeString", description: "Street address where the request was made" },
    { name: "ADDDATE", type: "esriFieldTypeDate", description: "Date/time the request was added" },
    { name: "RESOLUTIONDATE", type: "esriFieldTypeDate", description: "Date/time the request was resolved" },
  ],
  exemplars: [
    {
      question: "Bulk collection requests in DC",
      query: { where: "SERVICECODEDESCRIPTION = 'Bulk Collection'" },
    },
    {
      question: "Parking enforcement requests in Ward 6",
      query: { where: "SERVICECODEDESCRIPTION = 'Parking Enforcement' AND WARD = 'Ward 6'" },
    },
    {
      question: "Open tree inspection requests in DC",
      query: { where: "SERVICECODEDESCRIPTION = 'Tree Inspection' AND SERVICEORDERSTATUS <> 'Closed'" },
    },
    {
      question: "Emergency-priority 311 requests in DC",
      query: { where: "PRIORITY = 'Emergency'" },
    },
    {
      question: "311 requests handled by DDOT in DC",
      query: { where: "ORGANIZATIONACRONYM = 'DDOT'" },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
