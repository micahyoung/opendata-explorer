import { useState } from "react";
import { useCredentials } from "../../lib/credentials/useCredentials";
import { CredentialsForm } from "../onboarding/CredentialsForm";

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const credentials = useCredentials((s) => s.credentials);
  const save = useCredentials((s) => s.save);
  const clear = useCredentials((s) => s.clear);

  return (
    <div style={{ position: "absolute", top: 12, right: 12, zIndex: 900, fontFamily: "sans-serif" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ padding: "6px 12px", borderRadius: 6, background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
      >
        Settings
      </button>
      {open && (
        <div
          style={{
            marginTop: 6,
            background: "white",
            padding: 16,
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            width: 340,
            fontSize: 13,
          }}
        >
          <CredentialsForm
            initial={credentials}
            submitLabel="Save changes"
            onSubmit={(c) => {
              save(c);
              setOpen(false);
            }}
          />
          <button
            onClick={() => {
              clear();
              setOpen(false);
            }}
            style={{ width: "100%", marginTop: 8, padding: 8, color: "#c92a2a" }}
          >
            Clear credentials
          </button>
        </div>
      )}
    </div>
  );
}
