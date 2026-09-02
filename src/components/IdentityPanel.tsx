import { COUNTRIES } from '../lib/flags';

interface Props {
  country: string;
  onCountry: (code: string) => void;
}

export function IdentityPanel(p: Props) {
  return (
    <section className="panel">
      <h2>2 · Your chapter</h2>
      <label className="field">
        <span>Chapter</span>
        <select value={p.country} onChange={(e) => p.onCountry(e.target.value)}>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">Rendered uppercase, curved to the cloth, and shrunk to fit.</p>
    </section>
  );
}
