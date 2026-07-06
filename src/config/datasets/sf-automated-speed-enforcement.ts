import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "socrata",
  id: "d5uh-bk84",
  domain: "data.sfgov.org",
  name: "SF Automated Speed Enforcement Citations",
  description:
    "Daily counts of warnings and citations issued by SFMTA's Automated Speed Enforcement cameras — California's first city speed-camera pilot, authorized under state law (AB 645) and launched in 2025. Each row is one camera-day count, not an individual violation record, and doesn't capture every speeding vehicle (e.g. unreadable plates, staffing gaps).",
  geo: { mode: "native", field: "point" },
  mapColor: "#d1495b",
  categoryField: "analysis_neighborhood",
  fields: [
    { name: "date", type: "floating_timestamp", description: "Date the warnings/citations were issued" },
    { name: "site_id", type: "text", description: "Unique identifier for the camera site" },
    { name: "location", type: "text", description: "Human-readable site description, e.g. 'NB 2510 FRANKLIN ST' (match with LIKE against the street name)" },
    { name: "enforcement_type", type: "text", description: "Type of enforcement, e.g. 'FIXED SPEED'", facetable: true },
    { name: "dow", type: "text", description: "Day of week abbreviation, e.g. 'Mon', 'Tue'", facetable: true },
    { name: "issued_warnings", type: "number", description: "Number of warnings issued at this site on this date" },
    { name: "issued_citations", type: "number", description: "Number of citations issued at this site on this date" },
    { name: "posted_speed", type: "number", description: "Posted speed limit at this site, in mph" },
    { name: "avg_issued_speed", type: "number", description: "Average speed of vehicles that received a warning or citation, in mph" },
    { name: "_11_to_15_mph_over", type: "number", description: "Count of warnings/citations for 11-15 mph over the posted limit" },
    { name: "_16_to_20_mph_over", type: "number", description: "Count of warnings/citations for 16-20 mph over the posted limit" },
    { name: "_21_plus_mph_over", type: "number", description: "Count of warnings/citations for 21+ mph over the posted limit" },
    { name: "point", type: "point", description: "Point geometry of the camera site, used for map rendering" },
    { name: "latitude", type: "number", description: "Latitude of the camera site" },
    { name: "longitude", type: "number", description: "Longitude of the camera site" },
    { name: "analysis_neighborhood", type: "text", description: "SF planning neighborhood containing the camera site, e.g. 'Tenderloin', 'Mission'", facetable: true },
    { name: "supervisor_district", type: "number", description: "SF Board of Supervisors district containing the camera site", facetable: true },
  ],
  exemplars: [
    {
      question: "Speed camera citations in the Tenderloin in SF",
      soql: {
        where: "analysis_neighborhood = 'Tenderloin'",
        order: "date DESC",
        limit: 1000,
      },
    },
    {
      question: "Speed camera citations in SF so far in 2026",
      soql: {
        where: "date > '2026-01-01T00:00:00'",
        order: "date DESC",
        limit: 1000,
      },
    },
    {
      question: "Speed camera citations near Golden Gate Park in SF",
      soql: {
        where: "within_circle(point, 37.7694, -122.4862, 2000)",
        order: "date DESC",
        limit: 1000,
      },
    },
    {
      question: "Serious speeders (21+ mph over) caught in SF so far in 2026",
      soql: {
        where: "_21_plus_mph_over > 0 AND date > '2026-01-01T00:00:00'",
        order: "date DESC",
        limit: 1000,
      },
    },
    {
      question: "Speed camera citations on Franklin St in SF",
      soql: {
        where: "location like '%FRANKLIN%'",
        order: "date DESC",
        limit: 1000,
      },
    },
    {
      question: "Which SF speed cameras have issued at least one citation?",
      soql: {
        where: "issued_citations > 0",
        order: "date DESC",
        limit: 1000,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
