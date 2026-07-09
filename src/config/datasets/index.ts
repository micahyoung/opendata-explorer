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
import calgary311 from "./calgary-311";
import honolulu311 from "./honolulu-311";
import batonRouge311 from "./baton-rouge-311";
import nycPublicSchools from "./nyc-public-school-locations";
import sfAutomatedSpeedEnforcement from "./sf-automated-speed-enforcement";
import chicagoSpeedCameraViolations from "./chicago-speed-camera-violations";
import chicagoRedLightCameraViolations from "./chicago-red-light-camera-violations";
import raleigh311Requests from "./raleigh-311-requests";
import raleighStreetParkTrees from "./raleigh-street-park-trees";

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
  calgary311,
  honolulu311,
  batonRouge311,
  nycPublicSchools,
  sfAutomatedSpeedEnforcement,
  chicagoSpeedCameraViolations,
  chicagoRedLightCameraViolations,
  raleigh311Requests,
  raleighStreetParkTrees,
];

export const datasetIds = datasets.map((d) => d.id) as [string, ...string[]];

export function getDataset(id: string): DatasetDefinition | undefined {
  return datasets.find((d) => d.id === id);
}

export type {
  DatasetDefinition,
  SocrataDatasetDefinition,
  ArcgisDatasetDefinition,
  GeoConfig,
  DatasetField,
  SoqlExemplar,
  ArcgisExemplar,
} from "./datasets.schema";
export { BACKEND_SYNTAX_GUIDE } from "./datasets.schema";
