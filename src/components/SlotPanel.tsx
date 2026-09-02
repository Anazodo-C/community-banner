import type { Slot, SlotState, Template } from '../types/template';
import { headDiameterPx } from '../lib/render';
import { MIN_HEAD_PX } from '../types/template';
import { readingFacing, shouldAutoFlip } from '../lib/face';

interface Props {
  template: Template;
  slots: Record<number, SlotState>;
  selected: number | null;
  busy: number | null;
  onSelect: (id: number) => void;
  onUpload: (id: number, file: File) => void;
  onFlip: (id: number) => void;
  onClear: (id: number) => void;
  onAdjust: (id: number, patch: Partial<SlotState>) => void;
}

function facingLabel(slot: Slot, st: SlotState) {
  const d = st.detected;
  if (!d) return null;
  if (!d.ok) return d.message;
  const f = readingFacing({ ok: true, yaw: d.yaw, roll: d.roll, eyeMid: d.eyeMid, interocular: d.interocular, message: '' });
  const auto = shouldAutoFlip(
    { ok: true, yaw: d.yaw, roll: d.roll, eyeMid: d.eyeMid, interocular: d.interocular, message: '' },
    slot.facing,
  );
  const applied = st.flip !== null ? st.flip : auto;
  return `Photo faces ${f}, figure faces ${slot.facing}. ${applied ? 'Mirrored' : 'Not mirrored'}${
    st.flip !== null ? ' (manual)' : ' (auto)'
  }.`;
}

export function SlotPanel(p: Props) {
  return (
    <section className="panel">
      <h2>1 · Pick your face</h2>
      <p className="hint">
        Click a face on the banner or a card below. Slots you leave empty keep the figure that is already
        painted there — the scene is never shown with holes in it.
      </p>
      <div className="slot-grid">
        {p.template.slots.map((slot) => {
          const st = p.slots[slot.id];
          const head = headDiameterPx(slot, p.template);
          const small = head < MIN_HEAD_PX;
          return (
            <div
              key={slot.id}
              className={`slot-card${p.selected === slot.id ? ' is-selected' : ''}`}
              onClick={() => p.onSelect(slot.id)}
            >
              <div className="slot-head">
                <span className="slot-num">{slot.id}</span>
                <strong>{slot.name}</strong>
                <span className={`chip${small ? ' chip-warn' : ''}`}>{head.toFixed(0)}px</span>
              </div>
              <div className="slot-actions">
                <label className="btn btn-sm">
                  {st?.image ? 'Replace' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) p.onUpload(slot.id, f);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
                <button className="btn btn-sm" disabled={!st?.image} onClick={() => p.onFlip(slot.id)}>
                  Flip
                </button>
                <button className="btn btn-sm btn-ghost" disabled={!st?.image} onClick={() => p.onClear(slot.id)}>
                  Clear
                </button>
              </div>
              {p.busy === slot.id && <p className="note">Reading the face…</p>}
              {st?.image && (
                <>
                  <p className="note">{facingLabel(slot, st)}</p>
                  <div className="nudges">
                    <label>
                      Size
                      <input
                        type="range"
                        min={0.75}
                        max={2}
                        step={0.05}
                        value={st.scale}
                        onChange={(e) => p.onAdjust(slot.id, { scale: Number(e.target.value) })}
                      />
                      <span>{st.scale.toFixed(2)}×</span>
                    </label>
                    <label>
                      Across
                      <input
                        type="range"
                        min={-0.6}
                        max={0.6}
                        step={0.02}
                        value={st.offsetX}
                        onChange={(e) => p.onAdjust(slot.id, { offsetX: Number(e.target.value) })}
                      />
                      <span>{st.offsetX.toFixed(2)}</span>
                    </label>
                    <label>
                      Up/down
                      <input
                        type="range"
                        min={-0.6}
                        max={0.6}
                        step={0.02}
                        value={st.offsetY}
                        onChange={(e) => p.onAdjust(slot.id, { offsetY: Number(e.target.value) })}
                      />
                      <span>{st.offsetY.toFixed(2)}</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
