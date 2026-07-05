import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "iahh-g8bj",
  domain: "data.calgary.ca",
  name: "Calgary 311 Service Requests",
  description:
    "Calgary 311 service requests, including waste/recycling cart management, graffiti, snow and ice control, and other non-emergency requests, with type, responsible agency, status, and location.",
  geo: { mode: "native", field: "point" },
  mapColor: "#4b4bb8",
  categoryField: "service_name",
  fields: [
    { name: "service_request_id", type: "text", description: "Unique identifier for the service request" },
    { name: "requested_date", type: "floating_timestamp", description: "Date/time the request was created" },
    { name: "closed_date", type: "floating_timestamp", description: "Date/time the request was closed" },
    {
      name: "status_description",
      type: "text",
      description: "Status of the request, e.g. 'Open', 'Closed', 'Duplicate (Open)', 'Duplicate (Closed)'",
      facetable: true,
    },
    { name: "agency_responsible", type: "text", description: "Agency responsible for the request, e.g. 'TRAN - Roads', 'CS - Calgary Community Standards', 'UEP - Waste and Recycling Services'", facetable: true },
    {
      name: "service_name",
      type: "text",
      description:
        "Request type, e.g. 'WRS - Cart Management', 'Corporate - Graffiti Concerns', 'Bylaw - Snow and Ice on Sidewalk', 'Roads - Snow and Ice Control'",
      facetable: true,
    },
    { name: "address", type: "text", description: "Street address of the request" },
    { name: "comm_name", type: "text", description: "Community name, e.g. 'DOWNTOWN COMMERCIAL CORE', 'BELTLINE', 'BOWNESS'", facetable: true },
    { name: "latitude", type: "number", description: "Latitude of the request location" },
    { name: "longitude", type: "number", description: "Longitude of the request location" },
    { name: "point", type: "point", description: "Point geometry of the request location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Graffiti concerns reported in Calgary's Downtown Commercial Core",
      soql: {
        where: "service_name = 'Corporate - Graffiti Concerns' AND comm_name = 'DOWNTOWN COMMERCIAL CORE'",
        order: "requested_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Open snow and ice control requests in Calgary",
      soql: {
        where: "service_name = 'Roads - Snow and Ice Control' AND status_description = 'Open'",
        order: "requested_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Waste cart management requests in Calgary handled by Waste and Recycling Services",
      soql: {
        where: "service_name = 'WRS - Cart Management' AND agency_responsible = 'UEP - Waste and Recycling Services'",
        order: "requested_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Snow and ice on sidewalk complaints in Bowness, Calgary",
      soql: {
        where: "service_name = 'Bylaw - Snow and Ice on Sidewalk' AND comm_name = 'BOWNESS'",
        order: "requested_date DESC",
        limit: 1000,
      },
    },
    {
      question: "Noise concerns in Calgary's Beltline every Canada Day since 2020",
      soql: {
        where:
          "service_name = 'Bylaw - Noise Concerns' AND within_circle(point, 51.0404978, -114.0725934, 1200) AND date_extract_m(requested_date) = 7 AND date_extract_d(requested_date) = 1 AND requested_date >= '2020-01-01T00:00:00'",
        order: "requested_date DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
