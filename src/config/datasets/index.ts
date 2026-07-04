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
];

export const datasetIds = datasets.map((d) => d.id) as [string, ...string[]];

export function getDataset(id: string): DatasetDefinition | undefined {
  return datasets.find((d) => d.id === id);
}

export type { DatasetDefinition, GeoConfig, DatasetField, SoqlExemplar } from "./datasets.schema";
