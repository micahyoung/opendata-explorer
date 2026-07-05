import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "7ixm-mnvx",
  domain: "data.brla.gov",
  name: "Baton Rouge 311 Citizen Requests",
  description:
    "Baton Rouge (East Baton Rouge Parish) 311 requests, including garbage/recycling cart issues, mowing, street/traffic issues, and other non-emergency requests, with type, department, status, and location.",
  geo: { mode: "native", field: "geolocation" },
  mapColor: "#c9962f",
  categoryField: "typename",
  fields: [
    { name: "id", type: "text", description: "Unique identifier for the request" },
    { name: "createdate", type: "floating_timestamp", description: "Date/time the request was created" },
    { name: "statusdesc", type: "text", description: "Status of the request: 'OPEN', 'IN PROGRESS', or 'CLOSED'", facetable: true },
    { name: "department", type: "text", description: "Department responsible for the request, e.g. 'ENVIRONMENTAL SERVICES', 'MAINTENANCE', 'TRANSPORTATION AND DEVELOPMENT'", facetable: true },
    { name: "parenttype", type: "text", description: "High-level request category, e.g. 'STREET/TRAFFIC ISSUES', 'MOWING AND TREE ISSUES'", facetable: true },
    {
      name: "typename",
      type: "text",
      description:
        "Specific request type, e.g. 'DAMAGED GARBAGE CART', 'MISSED WOODY WASTE SERVICE', 'TALL GRASS', 'STREET LIGHT OUTAGE OR DAMAGE', 'REQUEST FOR MOWING'",
      facetable: true,
    },
    { name: "streetaddress", type: "text", description: "Street address of the request" },
    { name: "cityname", type: "text", description: "City/community name, e.g. 'BATON ROUGE', 'ZACHARY', 'CENTRAL', 'BAKER'", facetable: true },
    { name: "latitude", type: "number", description: "Latitude of the request location" },
    { name: "longitude", type: "number", description: "Longitude of the request location" },
    { name: "geolocation", type: "point", description: "Point geometry of the request location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Open damaged garbage cart requests in Baton Rouge",
      soql: {
        where: "typename = 'DAMAGED GARBAGE CART' AND statusdesc = 'OPEN'",
        order: "createdate DESC",
        limit: 1000,
      },
    },
    {
      question: "Tall grass complaints in Central, Baton Rouge",
      soql: {
        where: "typename = 'TALL GRASS' AND within_circle(geolocation, 30.5542266, -91.0367175, 8000)",
        order: "createdate DESC",
        limit: 1000,
      },
    },
    {
      question: "Street and traffic issue requests in Baton Rouge",
      soql: {
        where: "parenttype = 'STREET/TRAFFIC ISSUES'",
        order: "createdate DESC",
        limit: 1000,
      },
    },
    {
      question: "Missed woody waste service requests in Baton Rouge",
      soql: {
        where: "typename = 'MISSED WOODY WASTE SERVICE' AND cityname = 'BATON ROUGE'",
        order: "createdate DESC",
        limit: 1000,
      },
    },
    {
      question: "Requests handled by Baton Rouge's Environmental Services this year",
      soql: {
        where: "department = 'ENVIRONMENTAL SERVICES' AND createdate > '2026-01-01T00:00:00'",
        order: "createdate DESC",
        limit: 1000,
      },
    },
    {
      question: "Junk, trash, or debris complaints on private property in Baton Rouge every July 5th since 2020",
      soql: {
        where:
          "typename = 'JUNK, TRASH, OR DEBRIS ON PRIVATE PROPERTY' AND within_circle(geolocation, 30.4494155, -91.1869659, 12000) AND date_extract_m(createdate) = 7 AND date_extract_d(createdate) = 5 AND createdate >= '2020-01-01T00:00:00'",
        order: "createdate DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
