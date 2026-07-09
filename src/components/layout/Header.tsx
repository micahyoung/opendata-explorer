import type { ReactNode } from "react";

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "10px 16px",
        background: "var(--sign-green)",
        borderBottom: "3px solid var(--ink)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="sign-chip sign-chip--green" style={{ borderColor: "#fff" }}>
          Opendata Explorer
        </span>
        <span
          className="mono header-tagline"
          style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", letterSpacing: "0.02em" }}
        >
          311 · TREES · CAMERAS · SCHOOLS
        </span>
      </div>
      <div style={{ position: "relative" }}>{children}</div>
    </header>
  );
}
