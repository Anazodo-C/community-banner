import type { Slot, SlotState, Template } from '../types/template';
import { shouldAutoFlip } from './face';
import { drawTextOnCurve, samplePolyline, type Pt } from './curveText';
import { chapterText, countryByCode, drawFlag } from './flags';
import { drawAnimation, type AnimAssets } from './animate';

export const FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";

/**
 * X banner obstructions, in 1500x500 space. Nothing that matters should sit
 * under them. Kept here as the reference the slot and path geometry is
 * checked against.
 */
export const ZONES = [
  { name: 'Profile photo', x: 0, y: 280, w: 220, h: 220 },
  { name: 'Follow button', x: 1300, y: 400, w: 200, h: 100 },
  { name: 'Mobile trim (top)', x: 0, y: 0, w: 1500, h: 50 },
  { name: 'Mobile trim (bottom)', x: 0, y: 450, w: 1500, h: 50 },
];
export const SAFE = { x: 220, y: 50, w: 1080, h: 400 };

export interface RenderOpts {
  template: Template;
  background: HTMLImageElement;
  slots: Record<number, SlotState>;
  /** ISO 3166-1 alpha-2 code of the chapter. */
  country: string;
  /** 0..1 loop position. Undefined renders a still. */
  phase?: number;
  /** Sprites and plate for the animated loop. Null renders a still. */
  anim?: AnimAssets | null;
}

export const slotPx = (s: Slot, t: Template, scale = 1) => {
  const rx = (s.r / 100) * t.canvas.w * scale;
  return {
    cx: (s.x / 100) * t.canvas.w,
    cy: (s.y / 100) * t.canvas.h,
    rx,
    ry: rx * (s.ratio ?? 1.25),
  };
};

/** Head diameter in exported pixels — what the 80px guidance measures. */
export const headDiameterPx = (s: Slot, t: Template) => (s.r / 100) * t.canvas.w * 2;

export function emptySlotState(): SlotState {
  return { image: null, flip: null, detected: null, scale: 1, offsetX: 0, offsetY: 0 };
}

/**
 * Composite one uploaded portrait into a slot.
 *
 * The photo is levelled on the eye line, mirrored when it faces against the
 * painted figure, scaled so interocular distance is a fixed fraction of the
 * slot, then masked to the head oval with a soft edge so it reads as drawn in
 * rather than stuck on.
 */
function drawAvatar(ctx: CanvasRenderingContext2D, slot: Slot, st: SlotState, t: Template) {
  const img = st.image;
  if (!img) return;
  const { cx, cy, rx, ry } = slotPx(slot, t, st.scale);
  const d = st.detected;

  const auto = d && d.ok
    ? shouldAutoFlip(
        { ok: true, yaw: d.yaw, roll: d.roll, eyeMid: d.eyeMid, interocular: d.interocular, message: '' },
        slot.facing,
      )
    : false;
  const flip = st.flip !== null ? st.flip : auto;

  const pad = Math.ceil(Math.max(rx, ry) * 1.8);
  const size = pad * 2;
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const o = off.getContext('2d');
  if (!o) return;
  o.imageSmoothingQuality = 'high';

  const ox = st.offsetX * rx;
  const oy = st.offsetY * ry;

  o.save();
  o.translate(pad, pad);
  if (d && d.ok && d.eyeMid && d.interocular) {
    // Eyes sit above the middle of a face oval, not on it.
    o.translate(ox, oy - ry * 0.18);
    if (flip) o.scale(-1, 1);
    // Mirroring negates angles, so the roll correction changes sign with it.
    o.rotate(flip ? d.roll : -d.roll);
    const s = (rx * 0.92) / d.interocular;
    o.scale(s, s);
    o.translate(-d.eyeMid.x, -d.eyeMid.y);
    o.drawImage(img, 0, 0);
  } else {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const side = Math.min(iw, ih);
    const dw = rx * 2.35;
    o.translate(ox, oy);
    if (flip) o.scale(-1, 1);
    o.drawImage(img, (iw - side) / 2, (ih - side) / 2, side, side, -dw / 2, -dw / 2, dw, dw);
  }
  o.restore();

  // Feathered elliptical mask.
  o.globalCompositeOperation = 'destination-in';
  o.save();
  o.translate(pad, pad);
  o.scale(1, ry / rx);
  const g = o.createRadialGradient(0, 0, rx * 0.68, 0, 0, rx);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(0.72, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  o.fillStyle = g;
  o.beginPath();
  o.arc(0, 0, rx, 0, Math.PI * 2);
  o.fill();
  o.restore();

  ctx.drawImage(off, cx - pad, cy - pad);

  // A hairline of the illustration's ink keeps the flat-vector look.
  ctx.save();
  ctx.strokeStyle = 'rgba(24,26,40,0.35)';
  ctx.lineWidth = Math.max(0.8, rx * 0.06);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.99, ry * 0.99, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The chapter's centreline, in canvas pixels. */
export function chapterPath(t: Template) {
  const pts: Pt[] = t.chapter.path.map(([x, y]) => ({
    x: (x / 100) * t.canvas.w,
    y: (y / 100) * t.canvas.h,
  }));
  return samplePolyline(pts);
}

function drawChapter(ctx: CanvasRenderingContext2D, o: RenderOpts) {
  const t = o.template;
  const country = countryByCode(o.country);
  if (!country) return;
  const path = chapterPath(t);

  let startPad = 0;
  const flagSpec = t.chapter.flag;
  if (flagSpec) {
    const fw = (flagSpec.w / 100) * t.canvas.w;
    const fh = (flagSpec.h / 100) * t.canvas.h;
    // Sit the flag just inside the leading edge, square to the local tangent.
    const at = path.length * 0.055 + fw * 0.55;
    const p = pointAt(path, at);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    if (o.phase !== undefined) {
      // The flag ripples in any animated scene, including imported ones that
      // have no plate or sprites of their own.
      drawWavingFlag(ctx, country, -fw / 2, -fh / 2, fw, fh, o.phase);
    } else {
      drawFlag(ctx, country, -fw / 2, -fh / 2, fw, fh);
    }
    ctx.restore();
    startPad = fw * 1.45;
  }

  ctx.save();
  drawTextOnCurve(ctx, {
    text: chapterText(country),
    path,
    inset: 0.055,
    maxFontPx: 56,
    minFontPx: 15,
    letterSpacing: 0.035,
    fontFamily: FONT,
    fill: '#1B3158',
    startPad,
  });
  ctx.restore();
}

function pointAt(path: ReturnType<typeof chapterPath>, d: number) {
  const { pts, cum } = path;
  const clamped = Math.max(0, Math.min(cum[cum.length - 1], d));
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= clamped) lo = mid;
    else hi = mid;
  }
  const seg = cum[hi] - cum[lo] || 1;
  const t = (clamped - cum[lo]) / seg;
  return {
    x: pts[lo].x + (pts[hi].x - pts[lo].x) * t,
    y: pts[lo].y + (pts[hi].y - pts[lo].y) * t,
    angle: Math.atan2(pts[hi].y - pts[lo].y, pts[hi].x - pts[lo].x),
  };
}

/**
 * The flag, sliced into vertical strips and displaced by a travelling wave, so
 * it ripples like cloth rather than sitting flat.
 */
function drawWavingFlag(
  ctx: CanvasRenderingContext2D,
  country: Parameters<typeof drawFlag>[1],
  x: number,
  y: number,
  w: number,
  h: number,
  phase: number,
) {
  const off = document.createElement('canvas');
  const S = 3; // supersample, so the strips do not alias
  off.width = Math.ceil(w * S);
  off.height = Math.ceil(h * S);
  const oc = off.getContext('2d');
  if (!oc) return;
  oc.scale(S, S);
  drawFlag(oc, country, 0, 0, w, h);

  const strips = Math.max(10, Math.round(w));
  const a = phase * Math.PI * 2;
  for (let i = 0; i < strips; i++) {
    const u = i / strips;
    const sw = w / strips;
    // Amplitude grows toward the fly end, as cloth held at one edge does.
    const amp = h * 0.13 * u;
    const dy = Math.sin(a - u * 4.4) * amp;
    const sy = 1 - Math.abs(Math.cos(a - u * 4.4)) * 0.06 * u;
    ctx.drawImage(
      off,
      Math.floor(u * w * S), 0, Math.ceil(sw * S), off.height,
      x + u * w, y + dy + (h * (1 - sy)) / 2, sw + 0.6, h * sy,
    );
  }
}

export function drawZoneOverlay(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.lineWidth = 3;
  for (const z of ZONES) {
    ctx.fillStyle = 'rgba(148,39,83,0.34)';
    ctx.strokeStyle = '#942753';
    ctx.fillRect(z.x, z.y, z.w, z.h);
    ctx.strokeRect(z.x, z.y, z.w, z.h);
    ctx.fillStyle = '#FDF0DC';
    ctx.font = `700 14px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(z.name.toUpperCase(), z.x + 10, z.y + 8);
  }
  ctx.setLineDash([12, 8]);
  ctx.strokeStyle = '#F3966F';
  ctx.strokeRect(SAFE.x, SAFE.y, SAFE.w, SAFE.h);
  ctx.restore();
}

/** Draw the whole banner into a context already scaled to 1500x500 space. */
export function renderBanner(ctx: CanvasRenderingContext2D, o: RenderOpts) {
  const { w, h } = o.template.canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';

  const animating = o.anim && o.phase !== undefined;
  if (animating) {
    // The plate has the moving parts erased; they are drawn back in motion.
    ctx.drawImage(o.anim!.plate, 0, 0, w, h);
    drawAnimation(ctx, o.anim!, o.phase!);
  } else {
    ctx.drawImage(o.background, 0, 0, w, h);
  }

  for (const slot of o.template.slots) {
    const st = o.slots[slot.id];
    if (st?.image) drawAvatar(ctx, slot, st, o.template);
  }

  drawChapter(ctx, o);
}

/** Render at 2x and downscale, so text and masks land antialiased. */
export function renderToCanvas(o: RenderOpts, supersample = 2): HTMLCanvasElement {
  const { w, h } = o.template.canvas;
  const big = document.createElement('canvas');
  big.width = w * supersample;
  big.height = h * supersample;
  const bctx = big.getContext('2d');
  if (!bctx) throw new Error('Canvas unavailable');
  bctx.scale(supersample, supersample);
  renderBanner(bctx, o);

  if (supersample === 1) return big;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('Canvas unavailable');
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(big, 0, 0, w, h);
  return out;
}
