import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { getDataset } from "../../config/datasets";
import { getDatasetColor } from "../../config/datasetColors";
import { useMapLayersStore } from "../../lib/mapState/mapLayersStore";
import type { SocrataQueryParams, SocrataQueryResult } from "../../types/socrataTool";
import { ErrorObservationBadge } from "./ErrorObservationBadge";

export function ToolCallCardContent({ args, result, isError, toolCallId }: ToolCallMessagePartProps<SocrataQueryParams, SocrataQueryResult>) {
  const dataset = args.datasetId ? getDataset(args.datasetId) : undefined;
  const accent = getDatasetColor(args.datasetId);
  const failed = isError || (result && !result.success);
  const statusColor = !result ? "var(--curb-yellow)" : failed ? "var(--alert-orange)" : accent;
  const statusLabel = !result ? "Querying" : failed ? "Query failed" : "Mapped";
  const hasEntry = useMapLayersStore((s) => s.entries.has(toolCallId));
  const clickable = Boolean(result?.success) && hasEntry;

  return (
    <div
      className={clickable ? "card clickable" : "card"}
      onClick={clickable ? () => useMapLayersStore.getState().activateLayer(toolCallId) : undefined}
      style={{
        margin: "10px 0",
        padding: 0,
        overflow: "hidden",
        borderLeft: `4px solid ${accent}`,
        cursor: clickable ? "pointer" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px 0" }}>
        <span className="label" style={{ fontSize: 11, color: accent }}>
          {dataset?.name ?? args.datasetId ?? "Dataset"}
        </span>
        <span className="label" style={{ fontSize: 10, color: statusColor, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
          {statusLabel}
        </span>
      </div>

      {args.where && (
        <div className="mono" style={{ fontSize: 12, padding: "6px 12px", color: "var(--ink-muted)" }}>
          {args.where}
        </div>
      )}

      {result && result.success && (
        <div style={{ fontSize: 13, padding: "0 12px 10px", color: "var(--ink)" }}>{result.featureCount.toLocaleString()} results</div>
      )}

      {failed && (
        <div style={{ padding: "0 12px 10px" }}>
          <ErrorObservationBadge message={result && !result.success ? result.error.message : "Unknown error"} />
        </div>
      )}
    </div>
  );
}
