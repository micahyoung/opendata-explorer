import type { FieldFacet } from "../lib/socrata/computeFacets";

export interface ArcgisQueryParams {
  datasetId: string;
  where?: string;
  outFields?: string;
  orderByFields?: string;
  resultRecordCount?: number;
  minLat?: number;
  maxLat?: number;
  minLon?: number;
  maxLon?: number;
}

export interface ArcgisQuerySuccess {
  success: true;
  featureCount: number;
  datasetId: string;
  where?: string;
  facets: FieldFacet[];
  breadcrumb: string;
  resultSetId: string;
}

export interface ArcgisQueryFailure {
  success: false;
  error: {
    kind: "validation" | "http" | "empty";
    message: string;
  };
  datasetId?: string;
}

export type ArcgisQueryResult = ArcgisQuerySuccess | ArcgisQueryFailure;
