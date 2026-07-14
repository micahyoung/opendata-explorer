import type { Point } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, { type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useShallow } from "zustand/react/shallow";
import { coordinateKey } from "../../lib/mapState/geo";
import { selectVisibleLayers, useMapLayersStore } from "../../lib/mapState/mapLayersStore";
import { usePinnedPointsStore } from "../../lib/mapState/pinnedPointsStore";
import { getDataLayerIds } from "./dataLayerIds";
import { DataLayer, STACK_COUNT_PROPERTY } from "./DataLayer";
import { HoverPopup, type HoverInfo } from "./HoverPopup";
import { MapLegend } from "./MapLegend";
import { INITIAL_VIEW_STATE, MAP_STYLE_URL } from "./mapStyle";

export function MapShell() {
  const mapRef = useRef<MapRef>(null);
  const visibleLayers = useMapLayersStore(useShallow(selectVisibleLayers));
  const entries = useMapLayersStore((s) => s.entries);
  const pendingFlyTo = useMapLayersStore((s) => s.pendingFlyTo);
  const clearFlyTo = useMapLayersStore((s) => s.clearFlyTo);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | undefined>(undefined);
  const pins = usePinnedPointsStore((s) => s.pins);
  const togglePin = usePinnedPointsStore((s) => s.togglePin);
  const unpin = usePinnedPointsStore((s) => s.unpin);

  const layerIdToEntry = useMemo(
    () => new Map(visibleLayers.map((layer) => [getDataLayerIds(layer.id).pointsLayerId, layer])),
    [visibleLayers]
  );
  const interactiveLayerIds = useMemo(
    () => visibleLayers.map((layer) => getDataLayerIds(layer.id).pointsLayerId),
    [visibleLayers]
  );

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

  useEffect(() => {
    return () => useMapLayersStore.getState().setMapInstance(null);
  }, []);

  const infoFromEvent = (e: MapLayerMouseEvent): { info: HoverInfo; key: string } | undefined => {
    const feature = e.features?.[0];
    const entry = feature && layerIdToEntry.get(feature.layer.id);
    if (!feature || !entry) return undefined;
    const [longitude, latitude] = (feature.geometry as Point).coordinates;
    return {
      info: {
        longitude,
        latitude,
        properties: feature.properties,
        datasetId: entry.datasetId,
        resultSetId: entry.id,
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

  const visiblePins = Array.from(pins.values()).filter((p) => entries.has(p.resultSetId));

  return (
    <>
      <MapGL
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={MAP_STYLE_URL}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={interactiveLayerIds.length > 0 ? interactiveLayerIds : undefined}
        cursor={hoverInfo ? "pointer" : "grab"}
        onLoad={(e) => useMapLayersStore.getState().setMapInstance(e.target)}
        onMoveEnd={() => useMapLayersStore.getState().markActiveResultsChanged()}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverInfo(undefined)}
        onClick={handleClick}
      >
        {visibleLayers.map((layer) => (
          <DataLayer key={layer.id} layer={layer} />
        ))}
        {visiblePins.map(({ key, pinnedAt, ...info }) => (
          <HoverPopup key={key} {...info} pinned onClose={() => unpin(key)} />
        ))}
        {hoverInfo && <HoverPopup key="hover" {...hoverInfo} />}
      </MapGL>
      <MapLegend />
    </>
  );
}
