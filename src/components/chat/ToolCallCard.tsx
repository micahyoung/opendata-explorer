import { makeAssistantToolUI } from "@assistant-ui/react";
import { getDataset } from "../../config/datasets";
import { getDatasetColor } from "../../config/datasetColors";
import type { SocrataQueryParams, SocrataQueryResult } from "../../types/socrataTool";
import { ErrorObservationBadge } from "./ErrorObservationBadge";

export const ToolCallCard = makeAssistantToolUI<SocrataQueryParams, SocrataQueryResult>({
  toolName: "fetchSocrataData",
  render: ({ args, result, isError }) => {
    const dataset = args.datasetId ? getDataset(args.datasetId) : undefined;
    const accent = getDatasetColor(args.datasetId);
    const failed = isError || (result && !result.success);
    const statusColor = !result ? "var(--curb-yellow)" : failed ? "var(--alert-orange)" : accent;
    const statusLabel = !result ? "Querying" : failed ? "Query failed" : "Mapped";

    return (
      <div
        className="card"
        style={{
          margin: "10px 0",
          padding: 0,
          overflow: "hidden",
          borderLeft: `4px solid ${accent}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px 0" }}>
          <span className="label" style={{ fontSize: 11, color: accent }}>
            {dataset?.name ?? args.datasetId ?? "Dataset"}
          </span>
          <span
            className="label"
            style={{ fontSize: 10, color: statusColor, display: "flex", alignItems: "center", gap: 4 }}
          >
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
          <div style={{ fontSize: 13, padding: "0 12px 10px", color: "var(--ink)" }}>
            {result.featureCount.toLocaleString()} results
          </div>
        )}

        {failed && (
          <div style={{ padding: "0 12px 10px" }}>
            <ErrorObservationBadge message={result && !result.success ? result.error.message : "Unknown error"} />
          </div>
        )}
      </div>
    );
  },
});
