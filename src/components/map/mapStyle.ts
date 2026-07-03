/**
 * OpenFreeMap's "liberty" style: free, no API key required, unlike Mapbox/MapTiler.
 * Keeps the app's zero-config BYO-LLM-only promise intact — no tile key needed.
 */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export const INITIAL_VIEW_STATE = {
  longitude: -98.5,
  latitude: 39.5,
  zoom: 3.5,
};
