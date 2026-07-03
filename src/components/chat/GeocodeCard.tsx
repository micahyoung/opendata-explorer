import { makeAssistantToolUI } from "@assistant-ui/react";
import type { GeocodeParams, GeocodeResult } from "../../types/geocodeTool";
import { ErrorObservationBadge } from "./ErrorObservationBadge";

export const GeocodeCard = makeAssistantToolUI<GeocodeParams, GeocodeResult>({
  toolName: "geocodeLocation",
  render: ({ args, result, isError }) => {
    const failed = isError || (result && !result.success);
    const statusColor = !result ? "var(--curb-yellow)" : failed ? "var(--alert-orange)" : "var(--sign-green)";
    const statusLabel = !result ? "Locating" : failed ? "Not found" : "Found";

    return (
      <div
        className="card"
        style={{
          margin: "10px 0",
          padding: 0,
          overflow: "hidden",
          borderLeft: `4px solid ${statusColor}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px 0" }}>
          <span className="label" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
            Geocode
          </span>
          <span
            className="label"
            style={{ fontSize: 10, color: statusColor, display: "flex", alignItems: "center", gap: 4 }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
            {statusLabel}
          </span>
        </div>

        {args.query && (
          <div className="mono" style={{ fontSize: 12, padding: "6px 12px", color: "var(--ink-muted)" }}>
            {args.query}
          </div>
        )}

        {result && result.success && (
          <div style={{ fontSize: 13, padding: "0 12px 10px", color: "var(--ink)" }}>
            {result.displayName}
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
              {result.lat.toFixed(4)}, {result.lon.toFixed(4)}
            </div>
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
