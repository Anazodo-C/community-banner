interface Props {
  busy: string | null;
  gifProgress: { done: number; total: number } | null;
  lastSize: string | null;
  onPng: () => void;
  onGif: () => void;
}

export function ExportPanel(p: Props) {
  return (
    <section className="panel">
      <h2>
        4 · Export <span className="h2-note">click to download</span>
      </h2>
      <div className="row">
        <button className="btn btn-primary" disabled={!!p.busy} onClick={p.onPng}>
          {p.busy === 'png' ? 'Rendering…' : 'Banner PNG'}
        </button>
        <button className="btn" disabled={!!p.busy} onClick={p.onGif}>
          {p.busy === 'gif'
            ? `Encoding ${p.gifProgress?.done ?? 0}/${p.gifProgress?.total ?? 0}…`
            : 'GIF loop'}
        </button>
      </div>
      {p.lastSize && <p className="note">Last export: {p.lastSize}</p>}
    </section>
  );
}
