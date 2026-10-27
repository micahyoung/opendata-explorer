/** A Nominatim-shaped geocodeLocation success (bounding box padded the way fetchNominatim pads a point result). */
export const camdenYardsGeocode = {
  success: true,
  query: "Camden Yards, Baltimore, MD",
  displayName: "Oriole Park at Camden Yards, 333, West Camden Street, Baltimore, Maryland, 21201, United States",
  lat: 39.2839,
  lon: -76.6217,
  boundingBox: { minLat: 39.2809, maxLat: 39.2869, minLon: -76.6257, maxLon: -76.6177 },
};

/** The soft failure fetchSocrataData returns for a hallucinated column, as the model sees it. */
export const nyc311NoSuchColumn = {
  success: false,
  error: {
    kind: "http",
    message: 'Socrata rejected the query (HTTP 400): {"code":"query.soql.no-such-column","error":true,"message":"No such column: complaint"}',
  },
  datasetId: "nyc-311-service-requests",
};
