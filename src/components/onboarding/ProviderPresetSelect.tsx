import { providerPresets } from "../../config/providerPresets";

interface Props {
  value: string;
  onChange: (presetId: string) => void;
}

export function ProviderPresetSelect({ value, onChange }: Props) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ marginBottom: 4, fontWeight: 600 }}>Provider preset</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", padding: 6 }}>
        {providerPresets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  );
}
