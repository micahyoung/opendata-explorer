export function getDataLayerIds(layerId: string) {
  return {
    sourceId: `layer-${layerId}-source`,
    pointsLayerId: `layer-${layerId}-points`,
    stackLayerId: `layer-${layerId}-stack-count`,
  };
}
