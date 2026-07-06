import { useEffect, useRef, useState } from "react";
import { useCredentials } from "../../lib/credentials/useCredentials";
import { usePendingUrlConfig } from "../../lib/credentials/pendingUrlConfig";
import { encodeConfigParam } from "../../lib/credentials/urlConfigCodec";
import type { Credentials } from "../../types/credentials";
import { CredentialsForm } from "../onboarding/CredentialsForm";

export function SettingsPanel() {
  const credentials = useCredentials((s) => s.credentials);
  const save = useCredentials((s) => s.save);
  const clear = useCredentials((s) => s.clear);
  const pendingStatus = usePendingUrlConfig((s) => s.status);
  const consumePendingConfig = usePendingUrlConfig((s) => s.consume);
  const [pendingConfig, setPendingConfig] = useState<Credentials | undefined>(undefined);
  const consumedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy config link");

  useEffect(() => {
    if (consumedRef.current || !credentials || pendingStatus !== "ready") return;
    consumedRef.current = true;
    const config = consumePendingConfig();
    if (config) {
      setPendingConfig(config);
      setOpen(true);
    }
  }, [credentials, pendingStatus, consumePendingConfig]);

  const formInitial = pendingConfig ?? credentials;

  async function handleCopyLink() {
    if (!credentials) return;
    const encoded = await encodeConfigParam(credentials);
    const url = `${window.location.origin}${window.location.pathname}?config=${encoded}`;
    navigator.clipboard.writeText(url);
    setCopyLabel("Copied!");
    setTimeout(() => setCopyLabel("Copy config link"), 1500);
  }

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
            key={pendingConfig ? "url-config" : "saved"}
            initial={formInitial}
            submitLabel="Save changes"
            onSubmit={(c) => {
              save(c);
              setOpen(false);
            }}
          />
          {credentials && (
            <>
              <button className="btn btn-ghost" onClick={handleCopyLink} style={{ width: "100%", marginTop: 8 }}>
                {copyLabel}
              </button>
              <p className="field-hint">
                This link contains your API key, lightly obfuscated and tied to this domain — it won't work if
                pasted on another site. Still share it like a password.
              </p>
            </>
          )}
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
