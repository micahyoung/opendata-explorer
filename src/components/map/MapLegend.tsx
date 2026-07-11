import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { getDataset } from "../../config/datasets";
import { buildCategoricalColorScale } from "../../lib/mapState/categoricalColor";
import { selectVisibleLayers, useMapLayersStore } from "../../lib/mapState/mapLayersStore";

export function MapLegend() {
  const visibleLayers = useMapLayersStore(useShallow(selectVisibleLayers));

  const legends = useMemo(
    () =>
      visibleLayers
        .map((layer) => {
          const dataset = getDataset(layer.datasetId);
          if (!dataset) return undefined;
          const scale = buildCategoricalColorScale(dataset, layer.featureCollection);
          if (!scale) return undefined;
          return { layer, dataset, scale };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined),
    [visibleLayers]
  );

  if (legends.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        bottom: 24,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {legends.map(({ layer, dataset, scale }) => (
        <div
          key={layer.id}
          className="card clickable"
          onClick={() => useMapLayersStore.getState().activateLayer(layer.id)}
          style={{
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxWidth: 240,
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{dataset.name}</div>
          {scale.entries.map((entry) => (
            <div key={entry.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink)" }}>
              <span
                style={{ width: 9, height: 9, borderRadius: "50%", background: entry.color, flexShrink: 0 }}
              />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.value}</span>
            </div>
          ))}
          {scale.hasOther && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-muted)" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: scale.otherColor, flexShrink: 0 }} />
              <span>Other</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
