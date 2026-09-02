import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BannerCanvas } from './components/BannerCanvas';
import { SlotPanel } from './components/SlotPanel';
import { IdentityPanel } from './components/IdentityPanel';
import { TemplatePanel } from './components/TemplatePanel';
import { ExportPanel } from './components/ExportPanel';
import { cityTemplate } from './templates/cityTemplate';
import type { SlotState, Template } from './types/template';
import { emptySlotState, type RenderOpts, renderToCanvas } from './lib/render';
import { canvasToBlob, downloadBlob, loadImage, normaliseUpload, readFileAsDataUrl } from './lib/image';
import { readFace } from './lib/face';
import { decodeShare, shareUrl, stripFragment } from './lib/share';
import { validateTemplate } from './lib/validate';
import { sceneToTemplate } from './lib/importScene';
import { encodeGif } from './lib/gif';
import { loadAnimAssets, type AnimAssets } from './lib/animate';

const asset = (path: string) =>
  /^(data:|blob:|https?:)/.test(path) ? path : import.meta.env.BASE_URL + path.replace(/^\//, '');

const fmtBytes = (n: number) =>
  n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${Math.round(n / 1024)} KB`;

export default function App() {
  const [templates, setTemplates] = useState<Template[]>([cityTemplate]);
  const [template, setTemplate] = useState<Template>(cityTemplate);
  const [background, setBackground] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [slots, setSlots] = useState<Record<number, SlotState>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [busySlot, setBusySlot] = useState<number | null>(null);

  const [country, setCountry] = useState(cityTemplate.chapter.default);
  const [showHotspots, setShowHotspots] = useState(true);

  const [tplErrors, setTplErrors] = useState<string[]>([]);
  const [tplWarnings, setTplWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [exportBusy, setExportBusy] = useState<string | null>(null);
  const [gifProgress, setGifProgress] = useState<{ done: number; total: number } | null>(null);
  const [lastSize, setLastSize] = useState<string | null>(null);
  const anim = useRef<AnimAssets | null>(null);
  const bootstrapped = useRef(false);

  // Restore configuration from the fragment, once.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const cfg = decodeShare(window.location.hash);
    if (cfg.country) setCountry(cfg.country);
    if (cfg.slot !== undefined && cfg.slot !== null) setSelected(cfg.slot);
  }, []);

  useEffect(() => {
    let live = true;
    setLoadError(null);
    loadImage(asset(template.background))
      .then((img) => live && setBackground(img))
      .catch(() => live && setLoadError('Could not load the scene artwork.'));
    return () => {
      live = false;
    };
  }, [template]);

  // Keep the fragment in step so a reload or a paste round-trips.
  useEffect(() => {
    const hash = shareUrl({ template: template.id, slot: selected, country }).split('#')[1];
    history.replaceState(null, '', `${window.location.pathname}#${hash}`);
  }, [template.id, selected, country]);

  const patchSlot = useCallback((id: number, patch: Partial<SlotState>) => {
    setSlots((prev) => ({ ...prev, [id]: { ...(prev[id] ?? emptySlotState()), ...patch } }));
  }, []);

  const onUpload = useCallback(
    async (id: number, file: File) => {
      setBusySlot(id);
      setSelected(id);
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const img = await normaliseUpload(dataUrl);
        // Detection must never be able to block the upload.
        let detected: SlotState['detected'] = null;
        try {
          const r = await readFace(img);
          detected = {
            ok: r.ok, yaw: r.yaw, roll: r.roll,
            eyeMid: r.eyeMid, interocular: r.interocular, message: r.message,
          };
        } catch {
          detected = {
            ok: false, yaw: null, roll: 0, eyeMid: null, interocular: null,
            message: 'Face detection failed — centred the photo instead.',
          };
        }
        patchSlot(id, { image: img, detected, flip: null });
      } catch {
        patchSlot(id, {
          detected: {
            ok: false, yaw: null, roll: 0, eyeMid: null, interocular: null,
            message: 'That file could not be read. Try a JPG or PNG.',
          },
        });
      } finally {
        setBusySlot(null);
      }
    },
    [patchSlot],
  );

  const onFlip = useCallback(
    (id: number) => {
      setSlots((prev) => {
        const st = prev[id] ?? emptySlotState();
        const slot = template.slots.find((s) => s.id === id);
        // First press commits whatever is currently applied, then inverts it.
        const applied =
          st.flip !== null
            ? st.flip
            : !!(st.detected?.ok && slot && st.detected.yaw !== null && slot.facing !== 'center'
                ? (st.detected.yaw > 0 ? 'left' : st.detected.yaw < 0 ? 'right' : 'center') !== slot.facing &&
                  Math.abs(st.detected.yaw) > 0.06
                : false);
        return { ...prev, [id]: { ...st, flip: !applied } };
      });
    },
    [template],
  );

  const onClear = useCallback((id: number) => {
    setSlots((prev) => ({ ...prev, [id]: emptySlotState() }));
  }, []);

  const opts: RenderOpts | null = useMemo(
    () => (background ? { template, background, slots, country } : null),
    [template, background, slots, country],
  );

  const exportPng = async () => {
    if (!opts) return;
    setExportBusy('png');
    try {
      const canvas = renderToCanvas(opts, 2);
      const blob = await canvasToBlob(canvas, 'image/png');
      downloadBlob(blob, 'banner-1500x500.png');
      setLastSize(
        `${canvas.width}×${canvas.height} PNG, ${fmtBytes(blob.size)}` +
          (blob.size > 2 * 1024 * 1024 ? ' — over X’s 2MB limit' : ''),
      );
      stripFragment();
    } finally {
      setExportBusy(null);
    }
  };

  const exportGif = async () => {
    if (!opts) return;
    setExportBusy('gif');
    setGifProgress({ done: 0, total: 18 });
    try {
      // Only the built-in scene has the plate and sprites the motion needs.
      if (!anim.current && template.id === cityTemplate.id) {
        anim.current = await loadAnimAssets(import.meta.env.BASE_URL);
      }
      const useAnim = template.id === cityTemplate.id ? anim.current : null;
      const blob = await encodeGif({ ...opts, anim: useAnim }, (done, total) =>
        setGifProgress({ done, total }),
      );
      downloadBlob(blob, 'banner-1500x500.gif');
      setLastSize(`1500×500 GIF, ${fmtBytes(blob.size)}`);
      stripFragment();
    } catch (e) {
      setLastSize(`GIF failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExportBusy(null);
      setGifProgress(null);
    }
  };

  const applyTemplate = (t: Template) => {
    setTemplates((prev) => (prev.some((p) => p.id === t.id) ? prev : [...prev, t]));
    setTemplate(t);
    setSlots({});
    setSelected(null);
    setCountry(t.chapter.default);
  };

  const importTemplate = async (file: File) => {
    setTplErrors([]);
    setTplWarnings([]);
    setImporting(true);
    try {
      if (/^image\//.test(file.type)) {
        const { template: t, warnings } = await sceneToTemplate(file);
        setTplWarnings(warnings);
        applyTemplate(t);
        return;
      }
      const res = validateTemplate(JSON.parse(await file.text()));
      setTplErrors(res.errors);
      setTplWarnings(res.warnings);
      if (res.ok && res.template) applyTemplate(res.template);
    } catch (e) {
      setTplErrors([`Could not read that file: ${e instanceof Error ? e.message : String(e)}`]);
    } finally {
      setImporting(false);
    }
  };

  const exportTemplate = () => {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${template.id}.template.json`);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Arc Community Banner</h1>
          <p>Put yourself in the scene. A 1500×500 profile banner, built for the Arc community.</p>
        </div>
        <label className="check check-inline">
          <input type="checkbox" checked={showHotspots} onChange={(e) => setShowHotspots(e.target.checked)} />
          <span>Show slot markers</span>
        </label>
      </header>

      <main className="stage">
        <div className="canvas-wrap">
          {loadError && <div className="alert alert-error">{loadError}</div>}
          {opts ? (
            <BannerCanvas opts={opts} selected={selected} onSelect={setSelected} showHotspots={showHotspots} />
          ) : (
            <div className="canvas-skeleton">Loading the scene…</div>
          )}
          <p className="caption">
            Preview at 3:1. Every export is a true 1500×500 regardless of how this is scaled on screen.
          </p>
        </div>

        <aside className="controls">
          <SlotPanel
            template={template}
            slots={slots}
            selected={selected}
            busy={busySlot}
            onSelect={setSelected}
            onUpload={onUpload}
            onFlip={onFlip}
            onClear={onClear}
            onAdjust={patchSlot}
          />
          <IdentityPanel country={country} onCountry={setCountry} />
          <TemplatePanel
            template={template}
            builtIns={templates}
            warnings={tplWarnings}
            errors={tplErrors}
            importing={importing}
            onPick={(id) => {
              const t = templates.find((b) => b.id === id);
              if (t) applyTemplate(t);
            }}
            onImport={importTemplate}
            onExport={exportTemplate}
          />
          <ExportPanel
            busy={exportBusy}
            gifProgress={gifProgress}
            lastSize={lastSize}
            onPng={exportPng}
            onGif={exportGif}
          />
        </aside>
      </main>

      <footer className="footer">
        <p>
          Built by Anazodo Chukwumaijem — <a href="https://x.com/man_like_zodo">x.com/man_like_zodo</a> ·{' '}
          <a href="https://github.com/Anazodo-C">github.com/Anazodo-C</a>
        </p>
        <p>Arc™ is a trademark of Circle Internet Group, Inc. and/or its affiliates.</p>
        <p>Not affiliated with or endorsed by Circle Internet Group, Inc.</p>
      </footer>
    </div>
  );
}
