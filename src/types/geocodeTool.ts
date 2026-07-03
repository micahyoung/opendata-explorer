export interface GeocodeParams {
  query: string;
}

export interface GeocodeBoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface GeocodeSuccess {
  success: true;
  query: string;
  displayName: string;
  lat: number;
  lon: number;
  boundingBox: GeocodeBoundingBox;
}

export interface GeocodeFailure {
  success: false;
  query: string;
  error: {
    kind: "notFound" | "http";
    message: string;
  };
}

export type GeocodeResult = GeocodeSuccess | GeocodeFailure;
