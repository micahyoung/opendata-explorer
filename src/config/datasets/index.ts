import type { DatasetDefinition } from "./datasets.schema";
import serviceRequests311 from "./nyc-311-service-requests";
import treeCensus from "./nyc-tree-census";
import busLaneViolations from "./ny-bus-lane-violations";
import sfStreetTreeList from "./sf-street-tree-list";
import austinTreeInventory from "./austin-tree-inventory";
import cincinnati311 from "./cincinnati-311";

export const datasets: DatasetDefinition[] = [
  serviceRequests311,
  treeCensus,
  busLaneViolations,
  sfStreetTreeList,
  austinTreeInventory,
  cincinnati311,
];

export const datasetIds = datasets.map((d) => d.id) as [string, ...string[]];

export function getDataset(id: string): DatasetDefinition | undefined {
  return datasets.find((d) => d.id === id);
}

export type { DatasetDefinition, GeoConfig, DatasetField, SoqlExemplar } from "./datasets.schema";
