import { useEffect, useState } from "react";
import { datasets } from "../../config/datasets";
import { providerPresets } from "../../config/providerPresets";
import { fetchModels, type ModelInfo } from "../../lib/ai/fetchModels";
import { isSuitableModel } from "../../lib/ai/modelFiltering";
import type { Credentials } from "../../types/credentials";
import { ModelSelect } from "./ModelSelect";
import { ProviderPresetSelect } from "./ProviderPresetSelect";

const socrataDatasets = datasets.filter((d) => d.backend === "socrata");
const socrataDomains = [...new Set(socrataDatasets.map((d) => d.domain))];

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

/** Filters to models that look usable for text chat + tool calling; falls back to the
 * full list if that filter would leave nothing selectable (e.g. a local server with
 * a single, oddly-named model). */
function suitableModelIds(models: ModelInfo[], presetId: string): string[] {
  const suitable = models.filter((m) => isSuitableModel(m, presetId));
  return (suitable.length > 0 ? suitable : models).map((m) => m.id);
}

const MODEL_FETCH_DEBOUNCE_MS = 500;

export function CredentialsForm({ initial, onSubmit, submitLabel }: Props) {
  const initialPreset = providerPresets.find((p) => p.baseURL === initial?.baseURL)?.id ?? "openai";
  const [presetId, setPresetId] = useState(initialPreset);
  const [baseURL, setBaseURL] = useState(initial?.baseURL ?? providerPresets[0].baseURL);
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? "");
  const [model, setModel] = useState(initial?.model ?? providerPresets[0].defaultModel);
  const [socrataAppTokens, setSocrataAppTokens] = useState<Record<string, string>>(
    initial?.socrataAppTokens ?? {}
  );
  const addedDomains = Object.keys(socrataAppTokens);
  const remainingDomains = socrataDomains.filter((d) => !addedDomains.includes(d));
  const [domainToAdd, setDomainToAdd] = useState(remainingDomains[0] ?? "");
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
        const fetched = await fetchModels(baseURL, apiKey);
        if (cancelled) return;
        if (fetched.length === 0) {
          setModelList({ status: "error" });
          return;
        }
        const models = suitableModelIds(fetched, presetId);
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

  const selectedDomainToAdd = remainingDomains.includes(domainToAdd) ? domainToAdd : (remainingDomains[0] ?? "");

  function addToken(domain: string) {
    if (!domain) return;
    setSocrataAppTokens((prev) => ({ ...prev, [domain]: "" }));
    const next = remainingDomains.filter((d) => d !== domain);
    setDomainToAdd(next[0] ?? "");
  }

  function removeToken(domain: string) {
    setSocrataAppTokens((prev) => {
      const next = { ...prev };
      delete next[domain];
      return next;
    });
  }

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
    const tokenEntries = Object.entries(socrataAppTokens).filter(([, v]) => v.trim() !== "");
    onSubmit({
      provider: presetId,
      baseURL,
      apiKey,
      model,
      socrataAppTokens: tokenEntries.length > 0 ? Object.fromEntries(tokenEntries) : undefined,
    });
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

      <div style={{ marginBottom: 16 }}>
        <span className="field-label">Socrata app tokens (optional)</span>
        <p className="field-hint" style={{ marginTop: 0 }}>
          Only needed to raise rate limits on the Socrata domains you actually query.
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
                  value={socrataAppTokens[domain] ?? ""}
                  onChange={(e) => setSocrataAppTokens((prev) => ({ ...prev, [domain]: e.target.value }))}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => removeToken(domain)}
                  aria-label={`Remove token for ${domain}`}
                >
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            <button type="button" className="btn" onClick={() => addToken(selectedDomainToAdd)}>
              + Add
            </button>
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: "var(--alert-orange-dark)", fontSize: 13, marginTop: -6, marginBottom: 12 }}>{error}</p>
      )}

      <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
        {submitLabel}
      </button>
    </form>
  );
}
