import type { DatasetDefinition } from "./datasets.schema";
import serviceRequests311 from "./nyc-311-service-requests";
import treeCensus from "./nyc-tree-census";
import busLaneViolations from "./ny-bus-lane-violations";
import sfStreetTreeList from "./sf-street-tree-list";
import austinTreeInventory from "./austin-tree-inventory";
import cincinnati311 from "./cincinnati-311";
import chicago311 from "./chicago-311";
import sf311Cases from "./sf-311-cases";
import la311 from "./la-311";
import seattle311 from "./seattle-311";
import austin311 from "./austin-311";
import kansasCity311 from "./kansas-city-311";
import calgary311 from "./calgary-311";
import honolulu311 from "./honolulu-311";
import batonRouge311 from "./baton-rouge-311";
import nycPublicSchools from "./nyc-public-school-locations";
import sfAutomatedSpeedEnforcement from "./sf-automated-speed-enforcement";
import chicagoSpeedCameraViolations from "./chicago-speed-camera-violations";
import chicagoRedLightCameraViolations from "./chicago-red-light-camera-violations";
import raleigh311Requests from "./raleigh-311-requests";
import raleighStreetParkTrees from "./raleigh-street-park-trees";
import durhamTreesPlantingSites from "./durham-trees-planting-sites";
import dc311ServiceRequests from "./dc-311-service-requests";
import dcStreetTrees from "./dc-street-trees";
import dcAutomatedSafetyCameras from "./dc-automated-safety-cameras";
import dcPublicSchools from "./dc-public-schools";
import denverTreeInventory from "./denver-tree-inventory";
import denverPublicSchools from "./denver-public-schools";
import philadelphiaTreeInventory from "./philadelphia-tree-inventory";
import baltimore311ServiceRequests from "./baltimore-311-service-requests";
import baltimoreRedLightCameras from "./baltimore-red-light-cameras";
import baltimoreStreetTrees from "./baltimore-street-trees";
import louisville311 from "./louisville-311";
import cleveland311 from "./cleveland-311";
import newOrleans311 from "./new-orleans-311";
import boston311ServiceRequests from "./boston-311-service-requests";
import sacramentoStreetTrees from "./sacramento-street-trees";
import charlotteMecklenburgSchools from "./charlotte-mecklenburg-schools";
import portlandStreetTrees from "./portland-street-trees";
import seattleSdotTrees from "./seattle-sdot-trees";
import mesaTreeInventory from "./mesa-tree-inventory";
import baltimorePublicSchools from "./baltimore-public-schools";
import cincinnatiCountywideSchools from "./cincinnati-countywide-schools";
import nashvillePiniSchools from "./nashville-pini-schools";
import houstonISDSchools from "./houston-isd-schools";
import phoenixTreeInventory from "./phoenix-tree-inventory";
import seattlePublicSchools from "./seattle-public-schools";
import laCountyParkwayTrees from "./la-county-parkway-trees";
import chicagoCPSSchools from "./chicago-cps-schools";
import bostonPublicSchools from "./boston-public-schools";

export const datasets: DatasetDefinition[] = [
  serviceRequests311,
  treeCensus,
  busLaneViolations,
  sfStreetTreeList,
  austinTreeInventory,
  cincinnati311,
  chicago311,
  sf311Cases,
  la311,
  seattle311,
  austin311,
  kansasCity311,
  calgary311,
  honolulu311,
  batonRouge311,
  nycPublicSchools,
  sfAutomatedSpeedEnforcement,
  chicagoSpeedCameraViolations,
  chicagoRedLightCameraViolations,
  raleigh311Requests,
  raleighStreetParkTrees,
  durhamTreesPlantingSites,
  dc311ServiceRequests,
  dcStreetTrees,
  dcAutomatedSafetyCameras,
  dcPublicSchools,
  denverTreeInventory,
  denverPublicSchools,
  philadelphiaTreeInventory,
  baltimore311ServiceRequests,
  baltimoreRedLightCameras,
  baltimoreStreetTrees,
  louisville311,
  cleveland311,
  newOrleans311,
  boston311ServiceRequests,
  sacramentoStreetTrees,
  charlotteMecklenburgSchools,
  portlandStreetTrees,
  seattleSdotTrees,
  mesaTreeInventory,
  baltimorePublicSchools,
  cincinnatiCountywideSchools,
  nashvillePiniSchools,
  houstonISDSchools,
  phoenixTreeInventory,
  seattlePublicSchools,
  laCountyParkwayTrees,
  chicagoCPSSchools,
  bostonPublicSchools,
];

export const datasetIds = datasets.map((d) => d.id) as [string, ...string[]];

export function getDataset(id: string): DatasetDefinition | undefined {
  return datasets.find((d) => d.id === id);
}

export type {
  DatasetDefinition,
  SocrataDatasetDefinition,
  ArcgisDatasetDefinition,
  CkanDatasetDefinition,
  GeoConfig,
  DatasetField,
  SoqlExemplar,
  ArcgisExemplar,
  CkanExemplar,
} from "./datasets.schema";
export { BACKEND_SYNTAX_GUIDE } from "./datasets.schema";
