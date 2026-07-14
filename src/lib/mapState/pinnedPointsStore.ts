import { create } from "zustand";
import { useMapLayersStore } from "./mapLayersStore";

export interface PinnedPoint {
  key: string;
  longitude: number;
  latitude: number;
  properties: Record<string, unknown> | null | undefined;
  datasetId: string;
  resultSetId: string;
  stackedCount: number;
  pinnedAt: number;
}

interface PinnedPointsState {
  pins: Map<string, PinnedPoint>;
  togglePin: (point: Omit<PinnedPoint, "pinnedAt">) => void;
  unpin: (key: string) => void;
  clearPins: () => void;
}

export const usePinnedPointsStore = create<PinnedPointsState>((set) => ({
  pins: new Map(),
  togglePin: (point) =>
    set((state) => {
      const pins = new Map(state.pins);
      if (pins.has(point.key)) pins.delete(point.key);
      else pins.set(point.key, { ...point, pinnedAt: Date.now() });
      useMapLayersStore.getState().markActiveResultsChanged();
      return { pins };
    }),
  unpin: (key) =>
    set((state) => {
      const pins = new Map(state.pins);
      pins.delete(key);
      useMapLayersStore.getState().markActiveResultsChanged();
      return { pins };
    }),
  clearPins: () => {
    useMapLayersStore.getState().markActiveResultsChanged();
    set({ pins: new Map() });
  },
}));
