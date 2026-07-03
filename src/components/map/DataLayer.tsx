import type { ExpressionSpecification } from "@maplibre/maplibre-gl-style-spec";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { getDataset } from "../../config/datasets";
import { getDatasetColor } from "../../config/datasetColors";
import { buildCategoricalColorScale } from "../../lib/mapState/categoricalColor";
import type { ActiveLayer } from "../../lib/mapState/mapLayersStore";

export const ACTIVE_LAYER_ID = "active-layer-points";

export function DataLayer({ layer }: { layer: ActiveLayer }) {
  const color = useMemo<string | ExpressionSpecification>(() => {
    const dataset = getDataset(layer.datasetId);
    const scale = dataset ? buildCategoricalColorScale(dataset, layer.featureCollection) : undefined;
    return (scale?.matchExpression as ExpressionSpecification | undefined) ?? getDatasetColor(layer.datasetId);
  }, [layer.datasetId, layer.featureCollection]);

  return (
    <Source id="active-layer" type="geojson" data={layer.featureCollection}>
      <Layer
        id={ACTIVE_LAYER_ID}
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
