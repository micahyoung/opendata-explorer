import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "denver-traffic-accidents",
  featureServerUrl: "https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_CRIME_TRAFFICACCIDENTS5YR_P/FeatureServer/325",
  name: "Denver Traffic Accidents",
  description:
    "Denver Police Department's 5-year rolling record of traffic accidents, including hit & run, DUI, fatal, and serious-bodily-injury (SBI) crashes, with pedestrian/bicycle involvement flags. Locations reflect the approximate crash location, not necessarily the exact spot.",
  mapColor: "#b5452f",
  categoryField: "top_traffic_accident_offense",
  fields: [
    {
      name: "top_traffic_accident_offense",
      type: "esriFieldTypeString",
      description:
        "Type of traffic accident, fixed-width and right-padded with spaces -- always match with LIKE and a trailing '%', e.g. LIKE 'TRAF - ACCIDENT - FATAL%'. Values: 'TRAF - ACCIDENT', 'TRAF - ACCIDENT - DUI/DUID', 'TRAF - ACCIDENT - FATAL', 'TRAF - ACCIDENT - HIT & RUN', 'TRAF - ACCIDENT - POLICE', 'TRAF - ACCIDENT - SBI' (serious bodily injury)",
      facetable: true,
    },
    { name: "first_occurrence_date", type: "esriFieldTypeDate", description: "Date/time the accident occurred" },
    { name: "incident_address", type: "esriFieldTypeString", description: "Approximate address of the accident" },
    { name: "neighborhood_id", type: "esriFieldTypeString", description: "Denver neighborhood name, e.g. 'Baker', 'Skyland', 'Central Park'", facetable: true },
    { name: "district_id", type: "esriFieldTypeString", description: "Police district number", facetable: true },
    { name: "bicycle_ind", type: "esriFieldTypeInteger", description: "1 if a bicycle was involved, 0 otherwise" },
    { name: "pedestrian_ind", type: "esriFieldTypeInteger", description: "1 if a pedestrian was involved, 0 otherwise" },
    { name: "SERIOUSLY_INJURED", type: "esriFieldTypeInteger", description: "Count of people seriously injured in the accident" },
    { name: "FATALITIES", type: "esriFieldTypeInteger", description: "Count of fatalities in the accident" },
  ],
  exemplars: [
    {
      question: "Fatal traffic accidents in Denver",
      query: { where: "top_traffic_accident_offense LIKE 'TRAF - ACCIDENT - FATAL%'" },
    },
    {
      question: "Hit and run accidents in the Baker neighborhood of Denver",
      query: { where: "top_traffic_accident_offense LIKE 'TRAF - ACCIDENT - HIT & RUN%' AND neighborhood_id = 'Baker'" },
    },
    {
      question: "Accidents involving pedestrians in Denver",
      query: { where: "pedestrian_ind = 1" },
    },
    {
      question: "DUI-related accidents with serious injuries in Denver",
      query: { where: "top_traffic_accident_offense LIKE 'TRAF - ACCIDENT - DUI%' AND SERIOUSLY_INJURED > 0" },
    },
    {
      question: "Traffic accidents near downtown Denver",
      query: {
        where: "1=1",
        minLat: 39.744,
        maxLat: 39.754,
        minLon: -104.995,
        maxLon: -104.985,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
