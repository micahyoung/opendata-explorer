import type { FieldFacet } from "../lib/socrata/computeFacets";

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
