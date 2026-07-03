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

      {preset?.notes && (
        <p style={{ fontSize: 12, color: "#495057", marginTop: -4, marginBottom: 10 }}>{preset.notes}</p>
      )}

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ marginBottom: 4, fontWeight: 600 }}>Base URL</div>
        <input
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
          placeholder="https://api.openai.com/v1"
          style={{ width: "100%", padding: 6, boxSizing: "border-box" }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ marginBottom: 4, fontWeight: 600 }}>API key</div>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ width: "100%", padding: 6, boxSizing: "border-box" }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ marginBottom: 4, fontWeight: 600 }}>Model name</div>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="gpt-4o"
          style={{ width: "100%", padding: 6, boxSizing: "border-box" }}
        />
      </label>

      <label style={{ display: "block", marginBottom: 14 }}>
        <div style={{ marginBottom: 4, fontWeight: 600 }}>Socrata app token (optional)</div>
        <input
          value={socrataAppToken}
          onChange={(e) => setSocrataAppToken(e.target.value)}
          style={{ width: "100%", padding: 6, boxSizing: "border-box" }}
        />
      </label>

      {error && <p style={{ color: "#c92a2a", fontSize: 13 }}>{error}</p>}

      <button type="submit" style={{ width: "100%", padding: 10, fontWeight: 600 }}>
        {submitLabel}
      </button>
    </form>
  );
}
