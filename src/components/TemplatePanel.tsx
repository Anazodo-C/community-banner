import { useRef } from 'react';
import type { Template } from '../types/template';

interface Props {
  template: Template;
  builtIns: Template[];
  warnings: string[];
  errors: string[];
  importing: boolean;
  onPick: (id: string) => void;
  onImport: (file: File) => void;
  onExport: () => void;
}

export function TemplatePanel(p: Props) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className="panel">
      <h2>3 · Template</h2>
      <label className="field">
        <span>Scene</span>
        <select value={p.template.id} onChange={(e) => p.onPick(e.target.value)}>
          {p.builtIns.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <div className="row">
        <button className="btn" disabled={p.importing} onClick={() => input.current?.click()}>
          {p.importing ? 'Reading scene…' : 'Import scene or JSON'}
        </button>
        <button className="btn btn-ghost" onClick={p.onExport}>
          Export this template
        </button>
        <input
          ref={input}
          type="file"
          accept="application/json,.json,image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) p.onImport(f);
            e.currentTarget.value = '';
          }}
        />
      </div>
      <p className="hint">
        Drop in a PNG or JPEG and it is fitted to 1500×500 and turned into a template — faces in the
        picture become slots you can upload into. Template JSON imports too, and Export gives you the
        current one to edit.
      </p>

      {p.errors.length > 0 && (
        <div className="alert alert-error">
          <strong>Not loaded</strong>
          <ul>
            {p.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {p.warnings.length > 0 && (
        <div className="alert alert-warn">
          <strong>Loaded with warnings</strong>
          <ul>
            {p.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
