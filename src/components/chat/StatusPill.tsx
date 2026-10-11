interface StatusPillProps {
  label: string;
  color: string;
  pending: boolean;
}

/** Card header status: dot + label. While pending the dot pulses and the text stays dark (yellow text on white fails contrast). */
export function StatusPill({ label, color, pending }: StatusPillProps) {
  return (
    <span
      className="label"
      role="status"
      style={{ fontSize: 10, color: pending ? "var(--ink-muted)" : color, display: "flex", alignItems: "center", gap: 4 }}
    >
      <span
        aria-hidden="true"
        className={pending ? "status-dot status-dot--pending" : "status-dot"}
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
