import { useEffect, useRef, useState } from "react";
import Map, { type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapLayersStore } from "../../lib/mapState/mapLayersStore";
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
  const [pinnedInfo, setPinnedInfo] = useState<HoverInfo | undefined>(undefined);

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
    setPinnedInfo(undefined);
  }, [activeLayer]);

  const infoFromEvent = (e: MapLayerMouseEvent): HoverInfo | undefined => {
    const feature = e.features?.[0];
    if (!feature || !activeLayer) return undefined;
    return {
      longitude: e.lngLat.lng,
      latitude: e.lngLat.lat,
      properties: feature.properties,
      datasetId: activeLayer.datasetId,
      stackedCount: feature.properties?.[STACK_COUNT_PROPERTY] ?? 1,
    };
  };

  const handleMouseMove = (e: MapLayerMouseEvent) => {
    setHoverInfo(infoFromEvent(e));
  };

  const handleClick = (e: MapLayerMouseEvent) => {
    const info = infoFromEvent(e);
    if (info) setPinnedInfo(info);
  };

  return (
    <>
      <Map
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
        {pinnedInfo ? (
          <HoverPopup key="pinned" {...pinnedInfo} pinned onClose={() => setPinnedInfo(undefined)} />
        ) : (
          hoverInfo && <HoverPopup key="hover" {...hoverInfo} />
        )}
      </Map>
      <MapLegend />
    </>
  );
}
