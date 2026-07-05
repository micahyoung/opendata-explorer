import { useMemo } from "react";
import { getDataset } from "../../config/datasets";
import { buildCategoricalColorScale } from "../../lib/mapState/categoricalColor";
import { useMapLayersStore } from "../../lib/mapState/mapLayersStore";

export function MapLegend() {
  const activeLayer = useMapLayersStore((s) => (s.activeId ? s.entries.get(s.activeId) : undefined));

  const scale = useMemo(() => {
    if (!activeLayer) return undefined;
    const dataset = getDataset(activeLayer.datasetId);
    if (!dataset) return undefined;
    return buildCategoricalColorScale(dataset, activeLayer.featureCollection);
  }, [activeLayer]);

  if (!activeLayer || !scale) return null;

  return (
    <div
      className="card"
      style={{
        position: "absolute",
        left: 12,
        bottom: 24,
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        maxWidth: 240,
      }}
    >
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
  );
}
