import { providerPresets } from "../../config/providerPresets";

interface Props {
  value: string;
  onChange: (presetId: string) => void;
}

export function ProviderPresetSelect({ value, onChange }: Props) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span className="field-label">Provider preset</span>
      <select className="field-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {providerPresets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  );
}
