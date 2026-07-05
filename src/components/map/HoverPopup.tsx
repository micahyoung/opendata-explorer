import { Popup } from "react-map-gl/maplibre";
import { getDataset } from "../../config/datasets";

function fieldLabel(name: string): string {
  return name.replace(/_/g, " ");
}

export interface HoverInfo {
  longitude: number;
  latitude: number;
  properties: Record<string, unknown> | null | undefined;
  datasetId: string;
  stackedCount: number;
}

export function HoverPopup({
  longitude,
  latitude,
  properties,
  datasetId,
  stackedCount,
  pinned = false,
  onClose,
}: HoverInfo & { pinned?: boolean; onClose?: () => void }) {
  const dataset = getDataset(datasetId);
  if (!dataset || !properties) return null;

  const rows = dataset.fields
    .filter((field) => field.type !== "point")
    .map((field) => {
      const raw = properties[field.name];
      if (raw === null || raw === undefined || raw === "") return undefined;
      const value = field.type === "floating_timestamp" ? new Date(String(raw)).toLocaleString() : String(raw);
      return { name: field.name, value };
    })
    .filter((row): row is { name: string; value: string } => row !== undefined);

  if (rows.length === 0) return null;

  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      closeButton={pinned}
      closeOnClick={false}
      onClose={onClose}
      offset={10}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 260 }}>
        {stackedCount > 1 && (
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>
            {stackedCount.toLocaleString()} records at this location — showing 1
          </div>
        )}
        {rows.map((row) => (
          <div key={row.name} style={{ display: "flex", gap: 8, fontSize: 12 }}>
            <span className="label" style={{ color: "var(--ink-muted)", flexShrink: 0 }}>
              {fieldLabel(row.name)}
            </span>
            <span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </Popup>
  );
}
