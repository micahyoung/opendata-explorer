import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "dc-automated-safety-cameras",
  featureServerUrl: "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Public_Safety_WebMercator/MapServer/43",
  name: "DC Automated Safety Cameras (ASC)",
  description:
    "Locations of Washington, D.C.'s automated traffic enforcement cameras, covering speed, red light, stop sign, and truck restriction enforcement.",
  mapColor: "#a83232",
  categoryField: "ENFORCEMENT_TYPE",
  fields: [
    { name: "ENFORCEMENT_TYPE", type: "esriFieldTypeString", description: "Type of enforcement, e.g. 'Speed', 'Red Light', 'Stop Sign', 'Truck Restriction'", facetable: true },
    { name: "LOCATION_DESCRIPTION", type: "esriFieldTypeString", description: "Description of the camera's location" },
    { name: "SPEED_LIMIT", type: "esriFieldTypeDouble", description: "Posted speed limit at the camera location, in mph" },
    { name: "CAMERA_STATUS", type: "esriFieldTypeString", description: "Operational status of the camera, e.g. 'Live'", facetable: true },
    { name: "ACTIVE_STATUS", type: "esriFieldTypeString", description: "Whether the camera is actively enforcing, e.g. 'Active', 'Inactive'", facetable: true },
    { name: "DEVICE_MOBILITY", type: "esriFieldTypeString", description: "Whether the camera is 'Fixed' or mobile (often empty)", facetable: true },
    { name: "WARD", type: "esriFieldTypeString", description: "DC ward number the camera is in, e.g. '3'", facetable: true },
  ],
  exemplars: [
    {
      question: "Speed cameras in DC",
      query: { where: "ENFORCEMENT_TYPE = 'Speed'" },
    },
    {
      question: "Red light cameras in Ward 3",
      query: { where: "ENFORCEMENT_TYPE = 'Red Light' AND WARD = '3'" },
    },
    {
      question: "Active fixed speed cameras in DC",
      query: { where: "ENFORCEMENT_TYPE = 'Speed' AND ACTIVE_STATUS = 'Active' AND DEVICE_MOBILITY = 'Fixed'" },
    },
    {
      question: "Stop sign cameras in DC",
      query: { where: "ENFORCEMENT_TYPE = 'Stop Sign'" },
    },
    {
      question: "Automated safety cameras near downtown DC",
      query: {
        where: "1=1",
        minLat: 38.895,
        maxLat: 38.905,
        minLon: -77.045,
        maxLon: -77.02,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
