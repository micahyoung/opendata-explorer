import type { FieldFacet } from "../lib/socrata/computeFacets";

export interface CkanQueryParams {
  datasetId: string;
  filters?: Record<string, string>;
  q?: string;
  sort?: string;
  limit?: number;
}

export interface CkanQuerySuccess {
  success: true;
  featureCount: number;
  datasetId: string;
  where?: string;
  facets: FieldFacet[];
  resultSetId: string;
  /** Tells the model the rows are already drawn on the map, so it does not fetch them again. */
  displayedOnMap: true;
}

export interface CkanQueryFailure {
  success: false;
  error: {
    kind: "validation" | "http" | "empty";
    message: string;
  };
  datasetId?: string;
}

export type CkanQueryResult = CkanQuerySuccess | CkanQueryFailure;
