export function ErrorObservationBadge({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: "var(--radius-sm)",
        background: "rgba(214, 90, 31, 0.1)",
        border: "1px solid var(--alert-orange)",
        color: "var(--alert-orange-dark)",
        fontSize: 12,
      }}
    >
      <span className="label" style={{ fontSize: 10.5 }}>
        Retrying —{" "}
      </span>
      <span className="mono">{message}</span>
    </div>
  );
}
