import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  id: "5ngg-rpne",
  domain: "data.seattle.gov",
  name: "Seattle Customer Service Requests",
  description:
    "Seattle 311 customer service requests, including potholes, graffiti, illegal dumping, abandoned vehicles, and other non-emergency requests, with type, responsible department, status, and location.",
  geo: { mode: "native", field: "latitude_longitude" },
  mapColor: "#1f8fbf",
  categoryField: "webintakeservicerequests",
  fields: [
    { name: "servicerequestnumber", type: "text", description: "Unique identifier for the service request" },
    { name: "createddate", type: "floating_timestamp", description: "Date/time the request was created" },
    {
      name: "servicerequeststatusname",
      type: "text",
      description: "Status of the request, e.g. 'Reported', 'Open', 'New', 'Closed', 'Transferred to Other Dept', 'Canceled'",
      facetable: true,
    },
    { name: "departmentname", type: "text", description: "City department responsible for the request, e.g. 'SDOT-Seattle Department of Transportation'", facetable: true },
    {
      name: "webintakeservicerequests",
      type: "text",
      description:
        "Request type, e.g. 'Pothole', 'Graffiti', 'Illegal Dumping / Needles', 'Abandoned Vehicle', 'Unauthorized Encampment', 'Parking Enforcement'",
      facetable: true,
    },
    { name: "location", type: "text", description: "Free-text street address of the request" },
    { name: "councildistrict", type: "text", description: "City Council district number" },
    { name: "latitude", type: "number", description: "Latitude of the request location" },
    { name: "longitude", type: "number", description: "Longitude of the request location" },
    { name: "latitude_longitude", type: "point", description: "Point geometry of the request location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Reported potholes in Seattle",
      soql: {
        where: "webintakeservicerequests = 'Pothole' AND servicerequeststatusname = 'Reported'",
        order: "createddate DESC",
        limit: 1000,
      },
    },
    {
      question: "Graffiti reports in Council District 3",
      soql: {
        where: "webintakeservicerequests = 'Graffiti' AND councildistrict = '3'",
        order: "createddate DESC",
        limit: 1000,
      },
    },
    {
      question: "Illegal dumping and needle reports",
      soql: {
        where: "webintakeservicerequests = 'Illegal Dumping / Needles'",
        order: "createddate DESC",
        limit: 1000,
      },
    },
    {
      question: "Unauthorized encampment reports handled by Seattle Parks",
      soql: {
        where: "webintakeservicerequests = 'Unauthorized Encampment' AND departmentname = 'SPR-Seattle Parks and Recreation'",
        order: "createddate DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
