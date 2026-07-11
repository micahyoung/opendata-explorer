import { datasetDefinitionSchema, type DatasetDefinition } from "./datasets.schema";

const definition: DatasetDefinition = {
  backend: "arcgis",
  id: "charlotte-mecklenburg-schools",
  featureServerUrl: "https://meckgis.mecklenburgcountync.gov/server/rest/services/CMSPublicSchool/FeatureServer/0",
  name: "Charlotte-Mecklenburg Schools (CMS)",
  description:
    "Locations of Charlotte-Mecklenburg Schools (CMS) public school campuses across Mecklenburg County, NC, with school type, grade range, magnet status, and operating status.",
  mapColor: "#2f6f99",
  categoryField: "school_typ",
  fields: [
    { name: "school", type: "esriFieldTypeString", description: "Name of the school" },
    { name: "school_typ", type: "esriFieldTypeString", description: "School type: 'ELEMENTARY', 'MIDDLE', or 'HIGH'", facetable: true },
    { name: "grdlevl", type: "esriFieldTypeString", description: "Grade range served, e.g. 'K-5', '6-8', '9-12'" },
    { name: "magnet", type: "esriFieldTypeString", description: "Magnet program status, e.g. 'Full', 'Partial', 'Choice Program', 'School Option', 'Non Magnet'", facetable: true },
    { name: "mag_focus", type: "esriFieldTypeString", description: "Focus area of the magnet program, if any" },
    { name: "schl_stat", type: "esriFieldTypeString", description: "Operating status: 'Current' or 'Future' (planned, not yet open)", facetable: true },
    { name: "address", type: "esriFieldTypeString", description: "Street address of the school" },
    { name: "city", type: "esriFieldTypeString", description: "City the school is in, e.g. 'Charlotte', 'Cornelius', 'Matthews', 'Huntersville'", facetable: true },
    { name: "zipcode", type: "esriFieldTypeDouble", description: "ZIP code of the school" },
  ],
  exemplars: [
    {
      question: "Elementary schools in Charlotte-Mecklenburg",
      query: { where: "school_typ = 'ELEMENTARY'" },
    },
    {
      question: "Full magnet high schools in CMS",
      query: { where: "school_typ = 'HIGH' AND magnet = 'Full'" },
    },
    {
      question: "Currently operating CMS middle schools",
      query: { where: "school_typ = 'MIDDLE' AND schl_stat = 'Current'" },
    },
    {
      question: "CMS schools in Matthews, NC",
      query: { where: "city = 'Matthews'" },
    },
    {
      question: "CMS schools near downtown Charlotte",
      query: {
        where: "1=1",
        minLat: 35.21,
        maxLat: 35.245,
        minLon: -80.855,
        maxLon: -80.82,
      },
    },
  ],
};

export default datasetDefinitionSchema.parse(definition);
