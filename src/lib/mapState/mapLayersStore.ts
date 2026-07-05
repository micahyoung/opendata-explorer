import type { FeatureCollection } from "geojson";
import { create } from "zustand";
import { computeBBox, type BBox } from "./geo";

export interface LayerEntry {
  id: string;
  datasetId: string;
  where?: string;
  featureCollection: FeatureCollection;
  bbox: BBox | undefined;
  createdAt: number;
}

const MAX_HISTORY = 20;

interface MapLayersState {
  entries: Map<string, LayerEntry>;
  order: string[];
  activeId: string | undefined;
  pendingFlyTo: BBox | undefined;
  addLayer: (entry: { id: string; datasetId: string; where?: string; featureCollection: FeatureCollection }) => void;
  activateLayer: (id: string) => void;
  clearFlyTo: () => void;
}

export const useMapLayersStore = create<MapLayersState>((set, get) => ({
  entries: new Map(),
  order: [],
  activeId: undefined,
  pendingFlyTo: undefined,
  addLayer: (entry) =>
    set((state) => {
      const entries = new Map(state.entries);
      const order = [...state.order, entry.id];
      entries.set(entry.id, {
        id: entry.id,
        datasetId: entry.datasetId,
        where: entry.where,
        featureCollection: entry.featureCollection,
        bbox: computeBBox(entry.featureCollection),
        createdAt: Date.now(),
      });

      while (order.length > MAX_HISTORY) {
        const evictedId = order.shift();
        if (evictedId) entries.delete(evictedId);
      }

      return {
        entries,
        order,
        activeId: entry.id,
        pendingFlyTo: entries.get(entry.id)?.bbox,
      };
    }),
  activateLayer: (id) => {
    const state = get();
    const entry = state.entries.get(id);
    if (!entry) return;
    if (state.activeId === id) return;
    set({ activeId: id, pendingFlyTo: entry.bbox });
  },
  clearFlyTo: () => set({ pendingFlyTo: undefined }),
}));
