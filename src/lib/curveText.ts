export interface Pt { x: number; y: number }

export interface SampledPath {
  pts: Pt[];
  /** Cumulative arc length at each point. */
  cum: number[];
  length: number;
}

function measure(pts: Pt[]): SampledPath {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return { pts, cum, length: cum[cum.length - 1] || 1 };
}

/** Sample a quadratic Bezier into a polyline with cumulative arc length. */
export function sampleQuad(p0: Pt, c: Pt, p2: Pt, steps = 220): SampledPath {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    pts.push({
      x: mt * mt * p0.x + 2 * mt * t * c.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * c.y + t * t * p2.y,
    });
  }
  return measure(pts);
}

/**
 * Sample a polyline through the given points using a centripetal Catmull-Rom
 * spline, so a handful of measured points become a smooth baseline without the
 * overshoot a uniform spline would introduce at the ends.
 */
export function samplePolyline(points: Pt[], perSegment = 24): SampledPath {
  if (points.length < 2) return measure(points.length ? [points[0], points[0]] : []);
  if (points.length === 2) return measure([points[0], points[1]]);

  const P = [points[0], ...points, points[points.length - 1]];
  const out: Pt[] = [];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1];
    const p1 = P[i];
    const p2 = P[i + 1];
    const p3 = P[i + 2];
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(points[points.length - 1]);
  return measure(out);
}

/** Position and tangent angle at a distance along the sampled path. */
export function atDistance(path: SampledPath, d: number) {
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

export interface CurveTextOpts {
  text: string;
  path: SampledPath;
  /** Fraction of path length left blank at each end. */
  inset: number;
  maxFontPx: number;
  minFontPx: number;
  letterSpacing: number;
  fontFamily: string;
  fill: string;
  /** Optional lead-in offset in px, e.g. to clear a flag. */
  startPad?: number;
}

/**
 * Lay text along the sampled path, shrinking the font until it fits rather
 * than truncating. Returns the font size actually used.
 *
 * Capitals are centred on the path by their own cap height, not by the em box.
 * An em box reserves room for descenders that all-caps text never uses, so
 * centring on it leaves the word sitting visibly high on the cloth.
 */
export function drawTextOnCurve(ctx: CanvasRenderingContext2D, o: CurveTextOpts): number {
  const chars = [...o.text];
  if (!chars.length) return o.maxFontPx;

  const pad = o.startPad ?? 0;
  const usable = o.path.length * (1 - o.inset * 2) - pad;

  const widthAt = (size: number) => {
    ctx.font = `800 ${size}px ${o.fontFamily}`;
    let w = 0;
    for (const ch of chars) w += ctx.measureText(ch).width + o.letterSpacing * size;
    return w - o.letterSpacing * size;
  };

  let font = o.maxFontPx;
  let w = widthAt(font);
  if (w > usable) {
    // Width scales close to linearly with font size; one estimate plus a
    // short correction loop lands it without a full binary search.
    font = Math.max(o.minFontPx, font * (usable / w));
    w = widthAt(font);
    let guard = 0;
    while (w > usable && font > o.minFontPx && guard++ < 40) {
      font -= 1;
      w = widthAt(font);
    }
  }

  ctx.font = `800 ${font}px ${o.fontFamily}`;
  ctx.fillStyle = o.fill;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Half the cap height, so the baseline sits below the path by exactly enough
  // to put the middle of the capitals on it.
  const m = ctx.measureText(o.text);
  const capHalf = (m.actualBoundingBoxAscent || font * 0.72) / 2;

  const spacing = o.letterSpacing * font;
  let d = o.path.length * o.inset + pad + (usable - w) / 2;

  for (const ch of chars) {
    const cw = ctx.measureText(ch).width;
    const p = atDistance(o.path, d + cw / 2);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillText(ch, 0, capHalf);
    ctx.restore();
    d += cw + spacing;
  }
  return font;
}
