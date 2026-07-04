import type { FieldFacet } from "../lib/socrata/computeFacets";
import type { DatasetField, SoqlExemplar } from "../config/datasets";

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
  breadcrumb: string;
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
  exemplars: SoqlExemplar[];
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
