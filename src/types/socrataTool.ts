import type { FeatureCollection } from "geojson";

export interface SocrataQueryParams {
  datasetId: string;
  select?: string;
  where?: string;
  order?: string;
  limit?: number;
}

export interface SocrataQuerySuccess {
  success: true;
  featureCollection: FeatureCollection;
  featureCount: number;
  datasetId: string;
  where?: string;
  requestUrl: string;
}

export interface SocrataQueryFailure {
  success: false;
  error: {
    kind: "validation" | "http" | "empty";
    message: string;
  };
  datasetId: string;
  requestUrl?: string;
}

export type SocrataQueryResult = SocrataQuerySuccess | SocrataQueryFailure;
