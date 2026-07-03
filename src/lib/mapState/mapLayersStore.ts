import type { FeatureCollection } from "geojson";
import { create } from "zustand";
import { computeBBox, type BBox } from "./geo";

export interface ActiveLayer {
  datasetId: string;
  featureCollection: FeatureCollection;
}

interface MapLayersState {
  activeLayer: ActiveLayer | undefined;
  pendingFlyTo: BBox | undefined;
  setActiveLayer: (layer: ActiveLayer) => void;
  clearFlyTo: () => void;
}

export const useMapLayersStore = create<MapLayersState>((set) => ({
  activeLayer: undefined,
  pendingFlyTo: undefined,
  setActiveLayer: (layer) =>
    set({ activeLayer: layer, pendingFlyTo: computeBBox(layer.featureCollection) }),
  clearFlyTo: () => set({ pendingFlyTo: undefined }),
}));
