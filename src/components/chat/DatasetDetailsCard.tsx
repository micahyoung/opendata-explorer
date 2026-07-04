import { makeAssistantToolUI } from "@assistant-ui/react";
import { getDataset } from "../../config/datasets";
import { getDatasetColor } from "../../config/datasetColors";
import type { DatasetDetailsParams, DatasetDetailsResult } from "../../types/socrataTool";

export const DatasetDetailsCard = makeAssistantToolUI<DatasetDetailsParams, DatasetDetailsResult>({
  toolName: "getDatasetDetails",
  render: ({ args, result }) => {
    const ids = args.datasetIds ?? [];
    const names = ids.map((id) => getDataset(id)?.name ?? id);
    const accent = getDatasetColor(ids[0]);
    const statusColor = !result ? "var(--curb-yellow)" : accent;
    const statusLabel = !result ? "Looking up schema" : "Schema loaded";

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px" }}>
          <span className="label" style={{ fontSize: 11, color: accent }}>
            {names.join(", ") || "Dataset"}
          </span>
          <span
            className="label"
            style={{ fontSize: 10, color: statusColor, display: "flex", alignItems: "center", gap: 4 }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
            {statusLabel}
          </span>
        </div>
      </div>
    );
  },
});
