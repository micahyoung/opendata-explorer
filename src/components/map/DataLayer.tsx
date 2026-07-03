import { Layer, Source } from "react-map-gl/maplibre";
import type { ActiveLayer } from "../../lib/mapState/mapLayersStore";

const LAYER_COLOR_BY_DATASET: Record<string, string> = {
  "erm2-nwe9": "#e8590c",
  "uvpi-gqnh": "#2f9e44",
};

export function DataLayer({ layer }: { layer: ActiveLayer }) {
  const color = LAYER_COLOR_BY_DATASET[layer.datasetId] ?? "#1971c2";

  return (
    <Source id="active-layer" type="geojson" data={layer.featureCollection}>
      <Layer
        id="active-layer-points"
        type="circle"
        paint={{
          "circle-radius": 4,
          "circle-color": color,
          "circle-opacity": 0.75,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        }}
      />
    </Source>
  );
}
