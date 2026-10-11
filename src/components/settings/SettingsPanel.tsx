import { useState } from "react";
import { datasets } from "../../config/datasets";
import { useSocrataTokens } from "../../lib/settings/socrataTokens";

const socrataDatasets = datasets.filter((d) => d.backend === "socrata");
const socrataDomains = [...new Set(socrataDatasets.map((d) => d.domain))];

function TokenForm({ onDone }: { onDone: () => void }) {
  const saved = useSocrataTokens((s) => s.tokens);
  const save = useSocrataTokens((s) => s.save);
  const [tokens, setTokens] = useState<Record<string, string>>(saved);
  const addedDomains = Object.keys(tokens);
  const remainingDomains = socrataDomains.filter((d) => !addedDomains.includes(d));
  const [domainToAdd, setDomainToAdd] = useState(remainingDomains[0] ?? "");
  const selectedDomainToAdd = remainingDomains.includes(domainToAdd) ? domainToAdd : (remainingDomains[0] ?? "");

  function removeToken(domain: string) {
    setTokens((prev) => {
      const next = { ...prev };
      delete next[domain];
      return next;
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(tokens);
        onDone();
      }}
    >
      <span className="field-label">Socrata app tokens (optional)</span>
      <p className="field-hint" style={{ marginTop: 0 }}>
        Only needed to raise rate limits on the Socrata domains you actually query. Stored in this browser only.
      </p>

      {addedDomains.map((domain) => {
        const datasetNames = socrataDatasets
          .filter((d) => d.domain === domain)
          .map((d) => d.name)
          .join(", ");
        return (
          <div key={domain} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                className="field-input"
                type="password"
                autoComplete="off"
                placeholder={`Token for ${domain}`}
                value={tokens[domain] ?? ""}
                onChange={(e) => setTokens((prev) => ({ ...prev, [domain]: e.target.value }))}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn" onClick={() => removeToken(domain)} aria-label={`Remove token for ${domain}`}>
                Remove
              </button>
            </div>
            <p className="field-hint">
              {domain} — used by: {datasetNames}
            </p>
          </div>
        );
      })}

      {remainingDomains.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <select
            className="field-input"
            value={selectedDomainToAdd}
            onChange={(e) => setDomainToAdd(e.target.value)}
            style={{ flex: 1 }}
          >
            {remainingDomains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
          <button type="button" className="btn" onClick={() => setTokens((prev) => ({ ...prev, [selectedDomainToAdd]: "" }))}>
            + Add
          </button>
        </div>
      )}

      <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
        Save changes
      </button>
    </form>
  );
}

export function SettingsPanel() {
  const [open, setOpen] = useState(false);

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
          <TokenForm onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
