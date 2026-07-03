import { useCredentials } from "../../lib/credentials/useCredentials";
import { CredentialsForm } from "./CredentialsForm";

export function OnboardingModal() {
  const save = useCredentials((s) => s.save);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ background: "white", borderRadius: 10, padding: 24, width: 420, maxHeight: "90vh", overflowY: "auto" }}>
        <h2 style={{ marginTop: 0 }}>Welcome to Opendata Explorer</h2>
        <p style={{ fontSize: 13, color: "#495057" }}>
          This app is entirely client-side (no backend). To chat, bring your own OpenAI-compatible, tool-calling
          LLM endpoint and API key.
        </p>
        <p style={{ fontSize: 13, color: "#495057" }}>
          Your API key is stored <strong>unencrypted in your browser's localStorage</strong> and is sent only to the
          endpoint you configure below — never to any server we control. Providers that block direct browser CORS
          requests (most cloud APIs accessed without a compatible proxy) are not supported; use a CORS-enabled local
          server or a provider that allows browser calls (e.g. OpenRouter).
        </p>
        <CredentialsForm submitLabel="Save and start exploring" onSubmit={save} />
      </div>
    </div>
  );
}
