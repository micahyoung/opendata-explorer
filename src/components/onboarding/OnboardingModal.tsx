import { useState } from "react";
import { useCredentials } from "../../lib/credentials/useCredentials";
import { usePendingUrlConfig } from "../../lib/credentials/pendingUrlConfig";
import { CredentialsForm } from "./CredentialsForm";

export function OnboardingModal() {
  const save = useCredentials((s) => s.save);
  const consumePendingConfig = usePendingUrlConfig((s) => s.consume);
  const [pendingConfig] = useState(consumePendingConfig);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20, 24, 26, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        className="card"
        style={{ width: 440, maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow-panel)" }}
      >
        <div
          style={{
            background: "var(--sign-green)",
            padding: "16px 24px",
            borderBottom: "3px solid var(--ink)",
            borderTopLeftRadius: "var(--radius-md)",
            borderTopRightRadius: "var(--radius-md)",
          }}
        >
          <span className="sign-chip sign-chip--green" style={{ borderColor: "#fff" }}>
            Opendata Explorer
          </span>
          <p
            className="label"
            style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, margin: "10px 0 0", letterSpacing: "0.05em" }}
          >
            Bring your own LLM to start exploring
          </p>
        </div>

        <div style={{ padding: 24 }}>
          <p style={{ fontSize: 13.5, color: "var(--ink-muted)", marginTop: 0 }}>
            This app runs entirely in your browser — there's no backend of ours in the loop. To chat, connect an
            OpenAI-compatible endpoint that supports tool calling.
          </p>
          <p style={{ fontSize: 13.5, color: "var(--ink-muted)" }}>
            Your API key is stored <strong style={{ color: "var(--ink)" }}>unencrypted in localStorage</strong> and
            is sent only to the endpoint you configure below. Providers that block direct browser requests aren't
            supported — use a CORS-enabled local server or a browser-friendly provider like OpenRouter.
          </p>
          <CredentialsForm initial={pendingConfig} submitLabel="Save and start exploring" onSubmit={save} />
        </div>
      </div>
    </div>
  );
}
