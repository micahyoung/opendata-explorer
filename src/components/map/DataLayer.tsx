import { Layer, Source } from "react-map-gl/maplibre";
import { getDatasetColor } from "../../config/datasetColors";
import type { ActiveLayer } from "../../lib/mapState/mapLayersStore";

export function DataLayer({ layer }: { layer: ActiveLayer }) {
  const color = getDatasetColor(layer.datasetId);

  return (
    <Source id="active-layer" type="geojson" data={layer.featureCollection}>
      <Layer
        id="active-layer-points"
        type="circle"
        paint={{
          "circle-radius": 4,
          "circle-color": color,
          "circle-opacity": 0.8,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        }}
      />
    </Source>
  );
}
