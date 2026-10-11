import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "oakland-311",
  resourceId: "quth-gb8e",
  domain: "data.oaklandca.gov",
  name: "Oakland 311 Service Requests (OAK 311)",
  description:
    "Oakland OAK 311 service requests since 2020, including illegal dumping, abandoned vehicles, potholes, graffiti, homeless encampments, and other non-emergency requests, with category, status, source, and location. About 2% of rows have placeholder coordinates outside Oakland; add srx between -122.4 and -122.0 and sry between 37.6 and 38.0 to a where clause to exclude them.",
  geo: { mode: "latlon", latField: "sry", lonField: "srx" },
  mapColor: "#2a7f62",
  categoryField: "reqcategory",
  fields: [
    { name: "requestid", type: "number", description: "Unique identifier for the service request" },
    { name: "datetimeinit", type: "floating_timestamp", description: "Date/time the request was created" },
    { name: "datetimeclosed", type: "floating_timestamp", description: "Date/time the request was closed" },
    {
      name: "reqcategory",
      type: "text",
      description:
        "Request category code, all caps, e.g. 'ILLDUMP' (illegal dumping), 'ABANDONED AUTO', 'BLDGMAINT', 'POLICE', 'STREETSW' (streets and sidewalks), 'GRAFFITI', 'PARKING', 'ELECTRICAL' (street lights), 'TREES', 'RECYCLING', 'TRAFFIC', 'PARKS', 'HOMELESS EMT', 'OTHER'",
      facetable: true,
    },
    {
      name: "description",
      type: "text",
      description:
        "Request type, mixed case, e.g. 'Illegal Dumping - debris, appliances, etc.', 'Parking - Abandoned Vehicle', 'Streets - Potholes/Depression', 'Homeless Encampment', 'Street Light - Outage/Damaged' (match with LIKE against a keyword)",
      facetable: true,
    },
    {
      name: "status",
      type: "text",
      description:
        "Request status, all caps, e.g. 'CLOSED', 'CANCEL', 'REFERRED', 'OPEN', 'PENDING', 'UNFUNDED', 'EVALUATED - NO FURTHER ACTION', 'GONE ON ARRIVAL'",
      facetable: true,
    },
    {
      name: "source",
      type: "text",
      description: "How the request was submitted, e.g. 'SeeClickFix', 'Phone', 'Email', 'Website', 'Voicemail'",
      facetable: true,
    },
    { name: "referredto", type: "text", description: "Department or agency the request was referred to (often empty)" },
    { name: "councildistrict", type: "text", description: "City council district, e.g. 'CCD1' through 'CCD7' (some rows are empty or 'Piedmont')", facetable: true },
    { name: "beat", type: "text", description: "Police beat of the request location", facetable: true },
    { name: "probaddress", type: "text", description: "Street address or intersection of the request, e.g. '85TH AV&SAN LEANDRO ST'" },
    { name: "zipcode", type: "text", description: "ZIP code of the request location" },
    { name: "sry", type: "number", description: "Latitude of the request location" },
    { name: "srx", type: "number", description: "Longitude of the request location" },
  ],
  exemplars: [
    {
      question: "Illegal dumping requests in Oakland council district 3",
      soql: {
        where: "reqcategory = 'ILLDUMP' AND councildistrict = 'CCD3' AND srx between -122.4 and -122.0 AND sry between 37.6 and 38.0",
        order: "datetimeinit DESC",
        limit: 1000,
      },
    },
    {
      question: "Open pothole requests in Oakland",
      soql: {
        where: "description like '%Pothole%' AND status = 'OPEN' AND srx between -122.4 and -122.0 AND sry between 37.6 and 38.0",
        order: "datetimeinit DESC",
        limit: 1000,
      },
    },
    {
      question: "Abandoned vehicle reports in Oakland so far in 2026",
      soql: {
        where: "reqcategory = 'ABANDONED AUTO' AND datetimeinit > '2026-01-01T00:00:00' AND srx between -122.4 and -122.0 AND sry between 37.6 and 38.0",
        order: "datetimeinit DESC",
        limit: 1000,
      },
    },
    {
      question: "Graffiti reports submitted through SeeClickFix in Oakland",
      soql: {
        where: "reqcategory = 'GRAFFITI' AND source = 'SeeClickFix' AND srx between -122.4 and -122.0 AND sry between 37.6 and 38.0",
        order: "datetimeinit DESC",
        limit: 1000,
      },
    },
    {
      question: "Street light outages near Lake Merritt in Oakland",
      soql: {
        where: "description like '%Street Light%' AND srx between -122.2735 and -122.2535 AND sry between 37.7935 and 37.8135",
        order: "datetimeinit DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
