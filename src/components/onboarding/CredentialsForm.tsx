import { useState } from "react";
import { providerPresets } from "../../config/providerPresets";
import type { Credentials } from "../../types/credentials";
import { ProviderPresetSelect } from "./ProviderPresetSelect";

interface Props {
  initial?: Credentials;
  onSubmit: (credentials: Credentials) => void;
  submitLabel: string;
}

export function CredentialsForm({ initial, onSubmit, submitLabel }: Props) {
  const initialPreset = providerPresets.find((p) => p.baseURL === initial?.baseURL)?.id ?? "openai";
  const [presetId, setPresetId] = useState(initialPreset);
  const [baseURL, setBaseURL] = useState(initial?.baseURL ?? providerPresets[0].baseURL);
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? "");
  const [model, setModel] = useState(initial?.model ?? providerPresets[0].defaultModel);
  const [socrataAppToken, setSocrataAppToken] = useState(initial?.socrataAppToken ?? "");
  const [error, setError] = useState("");

  function handlePresetChange(id: string) {
    setPresetId(id);
    const preset = providerPresets.find((p) => p.id === id);
    if (preset && preset.id !== "custom") {
      setBaseURL(preset.baseURL);
      setModel(preset.defaultModel);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!baseURL || !apiKey || !model) {
      setError("Base URL, API key, and model are all required.");
      return;
    }
    setError("");
    onSubmit({ provider: presetId, baseURL, apiKey, model, socrataAppToken: socrataAppToken || undefined });
  }

  const preset = providerPresets.find((p) => p.id === presetId);

  return (
    <form onSubmit={handleSubmit}>
      <ProviderPresetSelect value={presetId} onChange={handlePresetChange} />

      {preset?.notes && <p className="field-hint">{preset.notes}</p>}

      <label style={{ display: "block", marginBottom: 12 }}>
        <span className="field-label">Base URL</span>
        <input
          className="field-input"
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
          placeholder="https://api.openai.com/v1"
        />
      </label>

      <label style={{ display: "block", marginBottom: 12 }}>
        <span className="field-label">API key</span>
        <input
          className="field-input"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </label>

      <label style={{ display: "block", marginBottom: 12 }}>
        <span className="field-label">Model name</span>
        <input
          className="field-input"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="gpt-4o"
        />
      </label>

      <label style={{ display: "block", marginBottom: 16 }}>
        <span className="field-label">Socrata app token (optional)</span>
        <input className="field-input" value={socrataAppToken} onChange={(e) => setSocrataAppToken(e.target.value)} />
      </label>

      {error && (
        <p style={{ color: "var(--alert-orange-dark)", fontSize: 13, marginTop: -6, marginBottom: 12 }}>{error}</p>
      )}

      <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
        {submitLabel}
      </button>
    </form>
  );
}
