import { useEffect, useRef, useState } from "react";
import Map, { type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapLayersStore } from "../../lib/mapState/mapLayersStore";
import { ACTIVE_LAYER_ID, DataLayer } from "./DataLayer";
import { HoverPopup, type HoverInfo } from "./HoverPopup";
import { MapLegend } from "./MapLegend";
import { INITIAL_VIEW_STATE, MAP_STYLE_URL } from "./mapStyle";

export function MapShell() {
  const mapRef = useRef<MapRef>(null);
  const activeLayer = useMapLayersStore((s) => s.activeLayer);
  const pendingFlyTo = useMapLayersStore((s) => s.pendingFlyTo);
  const clearFlyTo = useMapLayersStore((s) => s.clearFlyTo);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | undefined>(undefined);

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
  }, [activeLayer]);

  const handleMouseMove = (e: MapLayerMouseEvent) => {
    const feature = e.features?.[0];
    if (feature && activeLayer) {
      setHoverInfo({
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        properties: feature.properties,
        datasetId: activeLayer.datasetId,
      });
    } else {
      setHoverInfo(undefined);
    }
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
      >
        {activeLayer && <DataLayer layer={activeLayer} />}
        {hoverInfo && <HoverPopup {...hoverInfo} />}
      </Map>
      <MapLegend />
    </>
  );
}
