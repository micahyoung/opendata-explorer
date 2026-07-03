export function ErrorObservationBadge({ message }: { message: string }) {
  return (
    <div
      style={{
        marginTop: 6,
        padding: "6px 10px",
        borderRadius: 6,
        background: "#fff0f0",
        border: "1px solid #ffc9c9",
        color: "#c92a2a",
        fontSize: 12,
      }}
    >
      Query failed, retrying: {message}
    </div>
  );
}
