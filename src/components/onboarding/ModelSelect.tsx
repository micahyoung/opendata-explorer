interface Props {
  models: string[];
  value: string;
  onChange: (model: string) => void;
}

export function ModelSelect({ models, value, onChange }: Props) {
  const options = models.includes(value) || !value ? models : [value, ...models];

  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span className="field-label">Model</span>
      <select className="field-input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
    </label>
  );
}
