import type { DatasetDefinition } from "./datasets.schema";
import serviceRequests311 from "./311-service-requests";
import treeCensus from "./tree-census";

export const datasets: DatasetDefinition[] = [serviceRequests311, treeCensus];

export const datasetIds = datasets.map((d) => d.id) as [string, ...string[]];

export function getDataset(id: string): DatasetDefinition | undefined {
  return datasets.find((d) => d.id === id);
}

export type { DatasetDefinition, GeoConfig, DatasetField, SoqlExemplar } from "./datasets.schema";
