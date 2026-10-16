import type { FeatureCollection } from "geojson";
import type { Map as MapLibreMap } from "maplibre-gl";
import { create } from "zustand";
import { computeBBox, type BBox } from "./geo";

export interface LayerEntry {
  id: string;
  datasetId: string;
  where?: string;
  featureCollection: FeatureCollection;
  bbox: BBox | undefined;
  createdAt: number;
  summary: string;
}

const MAX_HISTORY = 20;

interface MapLayersState {
  entries: Map<string, LayerEntry>;
  order: string[];
  pendingFlyTo: BBox | undefined;
  mapInstance: MapLibreMap | null;
  activeResultsChanged: boolean;
  addLayer: (entry: {
    id: string;
    datasetId: string;
    where?: string;
    featureCollection: FeatureCollection;
    summary: string;
  }) => string;
  activateLayer: (id: string) => void;
  clearFlyTo: () => void;
  setMapInstance: (map: MapLibreMap | null) => void;
  markActiveResultsChanged: () => void;
  clearActiveResultsChanged: () => void;
}

function isSameResult(existing: LayerEntry, entry: { datasetId: string; where?: string; featureCollection: FeatureCollection }) {
  return (
    existing.datasetId === entry.datasetId &&
    existing.where === entry.where &&
    existing.featureCollection.features.length === entry.featureCollection.features.length &&
    JSON.stringify(existing.featureCollection) === JSON.stringify(entry.featureCollection)
  );
}

export const useMapLayersStore = create<MapLayersState>((set, get) => ({
  entries: new Map(),
  order: [],
  pendingFlyTo: undefined,
  mapInstance: null,
  activeResultsChanged: false,
  addLayer: (entry) => {
    // The same query returning the same rows is one result: show it once and hand back the layer that already holds it.
    const duplicate = get().order.find((id) => {
      const existing = get().entries.get(id);
      return existing && isSameResult(existing, entry);
    });
    if (duplicate) {
      get().activateLayer(duplicate);
      return duplicate;
    }
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
        summary: entry.summary,
      });

      while (order.length > MAX_HISTORY) {
        const evictedId = order.shift();
        if (evictedId) entries.delete(evictedId);
      }

      return {
        entries,
        order,
        pendingFlyTo: entries.get(entry.id)?.bbox,
        activeResultsChanged: true,
      };
    });
    return entry.id;
  },
  activateLayer: (id) => {
    const state = get();
    const entry = state.entries.get(id);
    if (!entry) return;
    set({ pendingFlyTo: entry.bbox, activeResultsChanged: true });
  },
  clearFlyTo: () => set({ pendingFlyTo: undefined }),
  setMapInstance: (map) => set({ mapInstance: map }),
  markActiveResultsChanged: () => set({ activeResultsChanged: true }),
  clearActiveResultsChanged: () => set({ activeResultsChanged: false }),
}));

export function selectVisibleLayers(state: MapLayersState): LayerEntry[] {
  return state.order
    .map((id) => state.entries.get(id))
    .filter((entry): entry is LayerEntry => entry !== undefined);
}
