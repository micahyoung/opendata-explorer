import type { Point } from "geojson";
import { useEffect, useRef, useState } from "react";
import MapGL, { type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { coordinateKey } from "../../lib/mapState/geo";
import { useMapLayersStore } from "../../lib/mapState/mapLayersStore";
import { usePinnedPointsStore } from "../../lib/mapState/pinnedPointsStore";
import { ACTIVE_LAYER_ID, DataLayer, STACK_COUNT_PROPERTY } from "./DataLayer";
import { HoverPopup, type HoverInfo } from "./HoverPopup";
import { MapLegend } from "./MapLegend";
import { INITIAL_VIEW_STATE, MAP_STYLE_URL } from "./mapStyle";

export function MapShell() {
  const mapRef = useRef<MapRef>(null);
  const activeLayer = useMapLayersStore((s) => (s.activeId ? s.entries.get(s.activeId) : undefined));
  const pendingFlyTo = useMapLayersStore((s) => s.pendingFlyTo);
  const clearFlyTo = useMapLayersStore((s) => s.clearFlyTo);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | undefined>(undefined);
  const pins = usePinnedPointsStore((s) => s.pins);
  const togglePin = usePinnedPointsStore((s) => s.togglePin);
  const unpin = usePinnedPointsStore((s) => s.unpin);
  const clearPins = usePinnedPointsStore((s) => s.clearPins);

  useEffect(() => {
    if (!pendingFlyTo || !mapRef.current) return;
    const [minLon, minLat, maxLon, maxLat] = pendingFlyTo;
    mapRef.current.fitBounds(
      [
        [minLon, minLat],
        [maxLon, maxLat],
      ],
      { padding: 60, duration: 1200, maxZoom: 15 }
    );
    clearFlyTo();
  }, [pendingFlyTo, clearFlyTo]);

  // A stale popup from the previous query's features shouldn't survive a new one.
  useEffect(() => {
    setHoverInfo(undefined);
    clearPins();
  }, [activeLayer, clearPins]);

  const infoFromEvent = (e: MapLayerMouseEvent): { info: HoverInfo; key: string } | undefined => {
    const feature = e.features?.[0];
    if (!feature || !activeLayer) return undefined;
    const [longitude, latitude] = (feature.geometry as Point).coordinates;
    return {
      info: {
        longitude,
        latitude,
        properties: feature.properties,
        datasetId: activeLayer.datasetId,
        stackedCount: feature.properties?.[STACK_COUNT_PROPERTY] ?? 1,
      },
      key: coordinateKey(longitude, latitude),
    };
  };

  const handleMouseMove = (e: MapLayerMouseEvent) => {
    const result = infoFromEvent(e);
    if (result && pins.has(result.key)) {
      setHoverInfo(undefined);
      return;
    }
    setHoverInfo(result?.info);
  };

  const handleClick = (e: MapLayerMouseEvent) => {
    const result = infoFromEvent(e);
    if (!result) return;
    togglePin({ key: result.key, ...result.info });
  };

  return (
    <>
      <MapGL
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={MAP_STYLE_URL}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={activeLayer ? [ACTIVE_LAYER_ID] : undefined}
        cursor={hoverInfo ? "pointer" : "grab"}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverInfo(undefined)}
        onClick={handleClick}
      >
        {activeLayer && <DataLayer layer={activeLayer} />}
        {Array.from(pins.values()).map(({ key, pinnedAt, ...info }) => (
          <HoverPopup key={key} {...info} pinned onClose={() => unpin(key)} />
        ))}
        {hoverInfo && <HoverPopup key="hover" {...hoverInfo} />}
      </MapGL>
      <MapLegend />
    </>
  );
}
