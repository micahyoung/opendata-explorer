import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "baltimore-red-light-cameras",
  featureServerUrl: "https://services3.arcgis.com/ZTvQ9NuONePFYofE/ArcGIS/rest/services/Baltimore_ATVES_Red_Light_Camera/FeatureServer/0",
  name: "Baltimore Automated Red Light Cameras",
  description:
    "Locations of Baltimore's automated red light enforcement camera program (ATVES).",
  mapColor: "#a83232",
  categoryField: "DisttNo",
  fields: [
    { name: "CamType", type: "esriFieldTypeString", description: "Camera type; always 'Red Light Camera' in this dataset" },
    { name: "DisttNo", type: "esriFieldTypeInteger", description: "Police district number the camera is in (1-14)", facetable: true },
    { name: "Quadrant", type: "esriFieldTypeInteger", description: "City quadrant number the camera is in (1-4)", facetable: true },
    { name: "Location", type: "esriFieldTypeString", description: "Description of the camera's location" },
    { name: "Status", type: "esriFieldTypeString", description: "Camera status; always 'Final' in this dataset" },
  ],
  exemplars: [
    {
      question: "Red light cameras in Baltimore police district 11",
      query: { where: "DisttNo = 11" },
    },
    {
      question: "Red light cameras in quadrant 1 of Baltimore",
      query: { where: "Quadrant = 1" },
    },
    {
      question: "All red light cameras in Baltimore",
      query: { where: "1=1" },
    },
    {
      question: "Red light cameras in Baltimore police district 7",
      query: { where: "DisttNo = 7" },
    },
    {
      question: "Red light cameras near downtown Baltimore",
      query: {
        where: "1=1",
        minLat: 39.285,
        maxLat: 39.295,
        minLon: -76.62,
        maxLon: -76.605,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
