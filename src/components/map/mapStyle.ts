/**
 * OpenFreeMap's "liberty" style: free, no API key required, unlike Mapbox/MapTiler.
 * Keeps the app's zero-config BYO-LLM-only promise intact — no tile key needed.
 */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export const INITIAL_VIEW_STATE = {
  longitude: -73.98,
  latitude: 40.75,
  zoom: 10,
};
