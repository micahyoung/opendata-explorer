import { useEffect, useRef } from "react";
import Map, { type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapLayersStore } from "../../lib/mapState/mapLayersStore";
import { DataLayer } from "./DataLayer";
import { INITIAL_VIEW_STATE, MAP_STYLE_URL } from "./mapStyle";

export function MapShell() {
  const mapRef = useRef<MapRef>(null);
  const activeLayer = useMapLayersStore((s) => s.activeLayer);
  const pendingFlyTo = useMapLayersStore((s) => s.pendingFlyTo);
  const clearFlyTo = useMapLayersStore((s) => s.clearFlyTo);

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

  return (
    <Map ref={mapRef} initialViewState={INITIAL_VIEW_STATE} mapStyle={MAP_STYLE_URL} style={{ width: "100%", height: "100%" }}>
      {activeLayer && <DataLayer layer={activeLayer} />}
    </Map>
  );
}
