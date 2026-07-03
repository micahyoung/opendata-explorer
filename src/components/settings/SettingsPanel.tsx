import { useState } from "react";
import { useCredentials } from "../../lib/credentials/useCredentials";
import { CredentialsForm } from "../onboarding/CredentialsForm";

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const credentials = useCredentials((s) => s.credentials);
  const save = useCredentials((s) => s.save);
  const clear = useCredentials((s) => s.clear);

  return (
    <div>
      <button
        className="btn btn-ghost"
        onClick={() => setOpen((v) => !v)}
        style={{ background: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.5)", color: "#fff" }}
      >
        Settings
      </button>
      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 900,
            padding: 18,
            width: 340,
            maxWidth: "calc(100vw - 24px)",
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
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
            className="btn btn-danger"
            onClick={() => {
              clear();
              setOpen(false);
            }}
            style={{ width: "100%", marginTop: 8 }}
          >
            Clear credentials
          </button>
        </div>
      )}
    </div>
  );
}
