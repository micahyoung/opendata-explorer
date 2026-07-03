import { useEffect, useState } from "react";
import { providerPresets } from "../../config/providerPresets";
import { fetchModels } from "../../lib/ai/fetchModels";
import type { Credentials } from "../../types/credentials";
import { ModelSelect } from "./ModelSelect";
import { ProviderPresetSelect } from "./ProviderPresetSelect";

interface Props {
  initial?: Credentials;
  onSubmit: (credentials: Credentials) => void;
  submitLabel: string;
}

type ModelListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; models: string[] }
  | { status: "error" };

const MODEL_FETCH_DEBOUNCE_MS = 500;

export function CredentialsForm({ initial, onSubmit, submitLabel }: Props) {
  const initialPreset = providerPresets.find((p) => p.baseURL === initial?.baseURL)?.id ?? "openai";
  const [presetId, setPresetId] = useState(initialPreset);
  const [baseURL, setBaseURL] = useState(initial?.baseURL ?? providerPresets[0].baseURL);
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? "");
  const [model, setModel] = useState(initial?.model ?? providerPresets[0].defaultModel);
  const [socrataAppToken, setSocrataAppToken] = useState(initial?.socrataAppToken ?? "");
  const [error, setError] = useState("");
  const [modelList, setModelList] = useState<ModelListState>({ status: "idle" });

  useEffect(() => {
    if (!baseURL || !apiKey) {
      setModelList({ status: "idle" });
      return;
    }

    let cancelled = false;
    setModelList({ status: "loading" });

    const timer = setTimeout(async () => {
      try {
        const models = await fetchModels(baseURL, apiKey);
        if (cancelled) return;
        if (models.length === 0) {
          setModelList({ status: "error" });
          return;
        }
        setModelList({ status: "loaded", models });
        setModel((current) => {
          if (current && models.includes(current)) return current;
          const preset = providerPresets.find((p) => p.id === presetId);
          if (preset?.defaultModel && models.includes(preset.defaultModel)) return preset.defaultModel;
          return models[0];
        });
      } catch {
        if (!cancelled) setModelList({ status: "error" });
      }
    }, MODEL_FETCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseURL, apiKey]);

  function handlePresetChange(id: string) {
    setPresetId(id);
    setModelList({ status: "idle" });
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

      {modelList.status === "loaded" ? (
        <ModelSelect models={modelList.models} value={model} onChange={setModel} />
      ) : (
        <>
          <label style={{ display: "block", marginBottom: modelList.status === "error" ? 0 : 12 }}>
            <span className="field-label">
              Model name{modelList.status === "loading" ? " (loading available models…)" : ""}
            </span>
            <input
              className="field-input"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o"
            />
          </label>
          {modelList.status === "error" && (
            <p className="field-hint">
              Couldn't load the model list from this provider (CORS or no /v1/models support) — enter a model id
              directly.
            </p>
          )}
        </>
      )}

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
