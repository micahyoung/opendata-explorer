import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "d4px-6rwg",
  domain: "data.kcmo.org",
  name: "Kansas City 311 Call Center Reported Issues",
  description:
    "Kansas City 311 service requests logged through the MyKCMO system, covering issues like graffiti, potholes, animal services, dangerous buildings, and homeless camp reports, with type, department, status, and location. Covers March 4, 2021 onward, when MyKCMO replaced the prior PeopleSoft CRM system; an older 2007-2021 dataset (d4px-6rwg's predecessor, 7at3-sxhp) is out of scope here.",
  geo: { mode: "native", field: "lat_long" },
  mapColor: "#c17817",
  categoryField: "issue_type",
  fields: [
    { name: "reported_issue", type: "text", description: "Unique identifier for the service request" },
    { name: "workorder_", type: "text", description: "Work order number" },
    {
      name: "current_status",
      type: "text",
      description:
        "Status of the request. Values are inconsistently cased across rows: 'active', 'assigned', 'Assigned', 'canceled', 'closed', 'Closed', 'new', 'received', 'Received'. Match case-insensitively, e.g. upper(current_status) = 'CLOSED'.",
      facetable: true,
    },
    { name: "open_date_time", type: "floating_timestamp", description: "Date/time the request was opened" },
    { name: "resolved_date", type: "floating_timestamp", description: "Date/time the request was resolved" },
    { name: "days_to_close", type: "number", description: "Number of days between open and resolution" },
    { name: "report_source", type: "text", description: "Channel the request was reported through" },
    {
      name: "issue_type",
      type: "text",
      description:
        "Request type, e.g. 'Graffiti', 'A Pothole', 'Animal Services', 'Dangerous Buildings', 'Homeless Camp'",
      facetable: true,
    },
    { name: "issue_sub_type", type: "text", description: "More specific sub-category of the issue type" },
    { name: "department_work_group", type: "text", description: "City department/work group responsible for the request", facetable: true },
    { name: "incident_address", type: "text", description: "Street address of the request" },
    { name: "council_district", type: "text", description: "City Council district", facetable: true },
    { name: "source_category", type: "text", description: "Category of the reporting source" },
    { name: "latitude", type: "number", description: "Latitude of the request location" },
    { name: "longitude", type: "number", description: "Longitude of the request location" },
    { name: "lat_long", type: "point", description: "Point geometry of the request location, used for map rendering" },
  ],
  exemplars: [
    {
      question: "Graffiti complaints in Kansas City",
      soql: {
        where: "issue_type = 'Graffiti'",
        order: "open_date_time DESC",
        limit: 1000,
      },
    },
    {
      question: "Open pothole requests in Kansas City",
      soql: {
        where: "issue_type = 'A Pothole' AND upper(current_status) != 'CLOSED'",
        order: "open_date_time DESC",
        limit: 1000,
      },
    },
    {
      question: "Dangerous building reports handled by Kansas City's code enforcement",
      soql: {
        where: "issue_type = 'Dangerous Buildings'",
        order: "open_date_time DESC",
        limit: 1000,
      },
    },
    {
      question: "Homeless camp reports in Kansas City's Council District 4",
      soql: {
        where: "issue_type = 'Homeless Camp' AND council_district = '4'",
        order: "open_date_time DESC",
        limit: 1000,
      },
    },
    {
      question: "311 requests near downtown Kansas City",
      soql: {
        where: "within_circle(lat_long, 39.0997, -94.5786, 1500)",
        order: "open_date_time DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
