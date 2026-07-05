import type { ExpressionSpecification } from "@maplibre/maplibre-gl-style-spec";
import type { Feature, FeatureCollection, Point } from "geojson";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";
import { getDataset } from "../../config/datasets";
import { getDatasetColor } from "../../config/datasetColors";
import { buildCategoricalColorScale } from "../../lib/mapState/categoricalColor";
import type { LayerEntry } from "../../lib/mapState/mapLayersStore";

export const ACTIVE_LAYER_ID = "active-layer-points";
export const STACK_COUNT_LAYER_ID = "active-layer-stack-count";
export const STACK_COUNT_PROPERTY = "__stackCount";

// Group features that share the exact same coordinate (e.g. community-centroid geocoding),
// so they render as one dot with a count instead of fully overlapping, indistinguishable circles.
// This is deliberately exact-match only — no pixel-radius proximity clustering — since the
// failure mode is duplicate coordinates, not merely nearby ones.
function groupByExactCoordinate(featureCollection: FeatureCollection): FeatureCollection {
  const groups = new Map<string, Feature<Point>[]>();
  for (const feature of featureCollection.features as Feature<Point>[]) {
    if (!feature.geometry || feature.geometry.type !== "Point") continue;
    const [lon, lat] = feature.geometry.coordinates;
    const key = `${lon.toFixed(6)},${lat.toFixed(6)}`;
    const group = groups.get(key);
    if (group) group.push(feature);
    else groups.set(key, [feature]);
  }

  return {
    type: "FeatureCollection",
    features: Array.from(groups.values()).map((group) => ({
      ...group[0],
      properties: { ...group[0].properties, [STACK_COUNT_PROPERTY]: group.length },
    })),
  };
}

export function DataLayer({ layer }: { layer: LayerEntry }) {
  const groupedFeatureCollection = useMemo(
    () => groupByExactCoordinate(layer.featureCollection),
    [layer.featureCollection]
  );

  const color = useMemo<string | ExpressionSpecification>(() => {
    const dataset = getDataset(layer.datasetId);
    const scale = dataset ? buildCategoricalColorScale(dataset, layer.featureCollection) : undefined;
    return (scale?.matchExpression as ExpressionSpecification | undefined) ?? getDatasetColor(layer.datasetId);
  }, [layer.datasetId, layer.featureCollection]);

  return (
    <Source id="active-layer" type="geojson" data={groupedFeatureCollection}>
      <Layer
        id={ACTIVE_LAYER_ID}
        type="circle"
        paint={{
          "circle-radius": ["step", ["get", STACK_COUNT_PROPERTY], 4, 10, 10, 100, 16],
          "circle-color": color,
          "circle-opacity": 0.8,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        }}
      />
      <Layer
        id={STACK_COUNT_LAYER_ID}
        type="symbol"
        filter={[">", ["get", STACK_COUNT_PROPERTY], 1]}
        layout={{
          "text-field": ["get", STACK_COUNT_PROPERTY],
          "text-size": 11,
        }}
        paint={{
          "text-color": "#ffffff",
        }}
      />
    </Source>
  );
}
