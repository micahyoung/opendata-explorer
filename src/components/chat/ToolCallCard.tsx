import { makeAssistantToolUI } from "@assistant-ui/react";
import { getDataset } from "../../config/datasets";
import type { SocrataQueryParams, SocrataQueryResult } from "../../types/socrataTool";
import { ErrorObservationBadge } from "./ErrorObservationBadge";

const cardStyle: React.CSSProperties = {
  marginTop: 6,
  marginBottom: 6,
  padding: "8px 12px",
  borderRadius: 8,
  background: "#f8f9fa",
  border: "1px solid #e9ecef",
  fontSize: 13,
};

export const ToolCallCard = makeAssistantToolUI<SocrataQueryParams, SocrataQueryResult>({
  toolName: "fetchSocrataData",
  render: ({ args, result, isError }) => {
    const dataset = args.datasetId ? getDataset(args.datasetId) : undefined;

    if (!result) {
      return (
        <div style={cardStyle}>
          Querying {dataset?.name ?? args.datasetId ?? "dataset"}
          {args.where ? ` where ${args.where}` : ""}
        </div>
      );
    }

    if (isError || !result.success) {
      const message = !result.success ? result.error.message : "Unknown error";
      return (
        <div style={cardStyle}>
          Querying {dataset?.name ?? args.datasetId}
          {args.where ? ` where ${args.where}` : ""}
          <ErrorObservationBadge message={message} />
        </div>
      );
    }

    return (
      <div style={cardStyle}>
        Mapped {result.featureCount} results from {dataset?.name ?? result.datasetId}
        {result.where ? ` (${result.where})` : ""}
      </div>
    );
  },
});
