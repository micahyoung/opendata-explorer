import type { FieldFacet } from "../lib/socrata/computeFacets";
import type { ArcgisExemplar, DatasetField, SoqlExemplar } from "../config/datasets";

export interface SocrataQueryParams {
  datasetId: string;
  select?: string;
  where?: string;
  order?: string;
  limit?: number;
}

export interface SocrataQuerySuccess {
  success: true;
  featureCount: number;
  datasetId: string;
  where?: string;
  facets: FieldFacet[];
  resultSetId: string;
}

export interface SocrataQueryFailure {
  success: false;
  error: {
    kind: "validation" | "http" | "empty";
    message: string;
  };
  datasetId?: string;
}

export type SocrataQueryResult = SocrataQuerySuccess | SocrataQueryFailure;

export interface DatasetDetailsParams {
  datasetIds: string[];
}

export interface DatasetDetailsSuccess {
  datasetId: string;
  success: true;
  fields: DatasetField[];
  exemplars: SoqlExemplar[] | ArcgisExemplar[];
  syntaxGuide: string;
}

export interface DatasetDetailsFailure {
  datasetId: string;
  success: false;
  error: {
    kind: "validation";
    message: string;
  };
}

export type DatasetDetailsResult = (DatasetDetailsSuccess | DatasetDetailsFailure)[];

export interface ResultSetSummary {
  resultSetId: string;
  datasetId: string;
  where?: string;
  featureCount: number;
  createdAt: number;
  summary: string;
}

export interface ListResultSetsResult {
  success: true;
  resultSets: ResultSetSummary[];
}

export interface ReadResultRowsParams {
  resultSetId: string;
  offset?: number;
  limit?: number;
  columns?: string[];
}

export interface ReadResultRowsSuccess {
  success: true;
  resultSetId: string;
  datasetId: string;
  offset: number;
  returned: number;
  totalFeatureCount: number;
  csv: string;
}

export interface ReadResultRowsFailure {
  success: false;
  error: {
    kind: "notFound";
    message: string;
  };
}

export type ReadResultRowsResult = ReadResultRowsSuccess | ReadResultRowsFailure;
