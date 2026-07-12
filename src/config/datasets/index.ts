import type { DatasetDefinition } from "./datasets.schema";

// Matches only dataset files (all contain a hyphen); excludes index.ts, datasets.schema.ts, etc.
const datasetModules = import.meta.glob<{ default: DatasetDefinition }>(
  "./*-*.ts",
  { eager: true },
);

const datasets: DatasetDefinition[] = Object.values(datasetModules)
  .map((mod) => mod.default)
  .sort((a, b) => a.name.localeCompare(b.name));

export { datasets };

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
