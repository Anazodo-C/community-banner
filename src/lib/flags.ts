/**
 * Countries and their flags, drawn on canvas.
 *
 * Deliberately not emoji: emoji flag glyphs render differently on every
 * operating system, so two members picking the same chapter would end up with
 * visibly different banners. These are drawn from primitives instead, so the
 * output is identical everywhere.
 *
 * `name` is what appears in the picker; `banner` overrides the text drawn on
 * the cloth where the full name is too long to read at banner size.
 */

type Band = { colors: string[]; weights?: number[] };
type Star = { c: string; cx: number; cy: number; r: number; points?: number };

export interface Country {
  code: string;
  name: string;
  /** Text drawn on the cloth. Defaults to `name`, uppercased. */
  banner?: string;

  bg?: string;
  h?: Band;
  v?: Band;
  /** Solid triangle from the hoist. */
  hoistTri?: { c: string; w: number };
  /** Solid vertical bar at the hoist. */
  hoistBar?: { c: string; w: number };
  /** Diagonal band from lower hoist to upper fly, over two triangles. */
  diagonal?: { c: string; fim?: string; t: number; tri: [string, string] };
  /** Union flag set into the canton, as on the Australian flag. */
  unionCanton?: { w: number; h: number };
  /** Nordic offset cross. */
  cross?: { c: string; fim?: string; t: number };
  /** Union-flag construction: saltires then upright cross. */
  union?: boolean;
  /** Canton block with a star field, as on the US flag. */
  canton?: { c: string; w: number; h: number; star: string };
  /** Diamond, as on the Brazilian flag. */
  rhombus?: { c: string; w: number; h: number };
  disc?: { c: string; cx: number; cy?: number; r: number };
  /** Carved by overlaying `bite` in the colour behind it. */
  crescent?: { c: string; cx: number; cy: number; r: number; bite: string; offset: number };
  stars?: Star[];
  star?: Star;
  /** Canadian maple leaf. */
  maple?: { c: string };
  /** Korean taegeuk. */
  taegeuk?: boolean;
}

const RAW: Country[] = [
  { code: 'AR', name: 'Argentina', h: { colors: ['#74ACDF', '#FFFFFF', '#74ACDF'] }, disc: { c: '#F6B40E', cx: 0.5, r: 0.13 } },
  { code: 'AU', name: 'Australia', bg: '#012169',
    unionCanton: { w: 0.5, h: 0.5 },
    stars: [
      { c: '#FFFFFF', cx: 0.76, cy: 0.26, r: 0.085 },
      { c: '#FFFFFF', cx: 0.85, cy: 0.54, r: 0.1 },
      { c: '#FFFFFF', cx: 0.73, cy: 0.76, r: 0.075 },
      { c: '#FFFFFF', cx: 0.93, cy: 0.8, r: 0.06 },
      { c: '#FFFFFF', cx: 0.26, cy: 0.79, r: 0.11, points: 7 },
    ] },
  { code: 'BD', name: 'Bangladesh', bg: '#006A4E', disc: { c: '#F42A41', cx: 0.45, r: 0.3 } },
  { code: 'BR', name: 'Brazil', bg: '#009B3A', rhombus: { c: '#FEDF00', w: 0.82, h: 0.82 }, disc: { c: '#002776', cx: 0.5, r: 0.22 } },
  { code: 'CM', name: 'Cameroon', v: { colors: ['#007A5E', '#CE1126', '#FCD116'] }, star: { c: '#FCD116', cx: 0.5, cy: 0.5, r: 0.16 } },
  { code: 'CA', name: 'Canada', v: { colors: ['#D80621', '#FFFFFF', '#D80621'], weights: [1, 2, 1] }, maple: { c: '#D80621' } },
  { code: 'CN', name: 'China', bg: '#EE1C25',
    stars: [
      { c: '#FFDE00', cx: 0.17, cy: 0.3, r: 0.2 },
      { c: '#FFDE00', cx: 0.33, cy: 0.14, r: 0.07 },
      { c: '#FFDE00', cx: 0.4, cy: 0.29, r: 0.07 },
      { c: '#FFDE00', cx: 0.4, cy: 0.5, r: 0.07 },
      { c: '#FFDE00', cx: 0.33, cy: 0.66, r: 0.07 },
    ] },
  { code: 'CO', name: 'Colombia', h: { colors: ['#FCD116', '#003893', '#CE1126'], weights: [2, 1, 1] } },
  { code: 'CI', name: "Côte d'Ivoire", v: { colors: ['#F77F00', '#FFFFFF', '#009E60'] } },
  { code: 'EG', name: 'Egypt', h: { colors: ['#CE1126', '#FFFFFF', '#000000'] } },
  { code: 'ET', name: 'Ethiopia', h: { colors: ['#078930', '#FCDD09', '#DA121A'] }, disc: { c: '#0F47AF', cx: 0.5, r: 0.28 } },
  { code: 'FR', name: 'France', v: { colors: ['#002395', '#FFFFFF', '#ED2939'] } },
  { code: 'DE', name: 'Germany', h: { colors: ['#000000', '#DD0000', '#FFCE00'] } },
  { code: 'GH', name: 'Ghana', h: { colors: ['#CE1126', '#FCD116', '#006B3F'] }, star: { c: '#000000', cx: 0.5, cy: 0.5, r: 0.16 } },
  { code: 'IN', name: 'India', h: { colors: ['#FF9933', '#FFFFFF', '#138808'] }, disc: { c: '#000080', cx: 0.5, r: 0.13 } },
  { code: 'ID', name: 'Indonesia', h: { colors: ['#CE1126', '#FFFFFF'] } },
  { code: 'IT', name: 'Italy', v: { colors: ['#008C45', '#F4F5F0', '#CD212A'] } },
  { code: 'JP', name: 'Japan', bg: '#FFFFFF', disc: { c: '#BC002D', cx: 0.5, r: 0.3 } },
  { code: 'KE', name: 'Kenya', h: { colors: ['#000000', '#FFFFFF', '#BB0000', '#FFFFFF', '#006600'], weights: [6, 1, 6, 1, 6] } },
  { code: 'MX', name: 'Mexico', v: { colors: ['#006847', '#FFFFFF', '#CE1126'] } },
  { code: 'MA', name: 'Morocco', bg: '#C1272D', star: { c: '#006233', cx: 0.5, cy: 0.5, r: 0.26 } },
  { code: 'NL', name: 'Netherlands', h: { colors: ['#AE1C28', '#FFFFFF', '#21468B'] } },
  { code: 'NG', name: 'Nigeria', v: { colors: ['#008751', '#FFFFFF', '#008751'] } },
  { code: 'NO', name: 'Norway', bg: '#BA0C2F', cross: { c: '#00205B', fim: '#FFFFFF', t: 0.18 } },
  { code: 'PK', name: 'Pakistan', v: { colors: ['#FFFFFF', '#01411C'], weights: [1, 3] },
    crescent: { c: '#FFFFFF', cx: 0.62, cy: 0.5, r: 0.3, bite: '#01411C', offset: 0.28 },
    star: { c: '#FFFFFF', cx: 0.78, cy: 0.36, r: 0.11 } },
  { code: 'PH', name: 'Philippines', h: { colors: ['#0038A8', '#CE1126'] }, hoistTri: { c: '#FFFFFF', w: 0.4 } },
  { code: 'PL', name: 'Poland', h: { colors: ['#FFFFFF', '#DC143C'] } },
  { code: 'PT', name: 'Portugal', v: { colors: ['#046A38', '#DA291C'], weights: [2, 3] } },
  { code: 'SN', name: 'Senegal', v: { colors: ['#00853F', '#FDEF42', '#E31B23'] }, star: { c: '#00853F', cx: 0.5, cy: 0.5, r: 0.16 } },
  { code: 'SG', name: 'Singapore', h: { colors: ['#EF3340', '#FFFFFF'] },
    crescent: { c: '#FFFFFF', cx: 0.22, cy: 0.26, r: 0.19, bite: '#EF3340', offset: 0.17 },
    stars: [
      { c: '#FFFFFF', cx: 0.36, cy: 0.14, r: 0.055 },
      { c: '#FFFFFF', cx: 0.46, cy: 0.21, r: 0.055 },
      { c: '#FFFFFF', cx: 0.42, cy: 0.34, r: 0.055 },
      { c: '#FFFFFF', cx: 0.30, cy: 0.34, r: 0.055 },
      { c: '#FFFFFF', cx: 0.26, cy: 0.21, r: 0.055 },
    ] },
  { code: 'ZA', name: 'South Africa', h: { colors: ['#E03C31', '#FFFFFF', '#007A4D', '#FFFFFF', '#001489'], weights: [5, 1, 3, 1, 5] }, hoistTri: { c: '#000000', w: 0.34 } },
  { code: 'KR', name: 'South Korea', bg: '#FFFFFF', taegeuk: true },
  { code: 'ES', name: 'Spain', h: { colors: ['#AA151B', '#F1BF00', '#AA151B'], weights: [1, 2, 1] } },
  { code: 'SE', name: 'Sweden', bg: '#006AA7', cross: { c: '#FECC00', t: 0.2 } },
  { code: 'TZ', name: 'Tanzania', diagonal: { c: '#000000', fim: '#FCD116', t: 0.34, tri: ['#1EB53A', '#00A3DD'] } },
  { code: 'TH', name: 'Thailand', h: { colors: ['#A51931', '#F4F5F8', '#2D2A4A', '#F4F5F8', '#A51931'], weights: [1, 1, 2, 1, 1] } },
  { code: 'TR', name: 'Türkiye', bg: '#E30A17',
    crescent: { c: '#FFFFFF', cx: 0.42, cy: 0.5, r: 0.28, bite: '#E30A17', offset: 0.26 },
    star: { c: '#FFFFFF', cx: 0.64, cy: 0.5, r: 0.13 } },
  { code: 'UG', name: 'Uganda', h: { colors: ['#000000', '#FCDC04', '#D90000', '#000000', '#FCDC04', '#D90000'] }, disc: { c: '#FFFFFF', cx: 0.5, r: 0.24 } },
  { code: 'UA', name: 'Ukraine', h: { colors: ['#0057B7', '#FFD700'] } },
  { code: 'AE', name: 'United Arab Emirates', banner: 'UAE', h: { colors: ['#00732F', '#FFFFFF', '#000000'] }, hoistBar: { c: '#FF0000', w: 0.25 } },
  { code: 'GB', name: 'United Kingdom', bg: '#012169', union: true },
  { code: 'US', name: 'United States',
    h: { colors: ['#B31942', '#FFFFFF', '#B31942', '#FFFFFF', '#B31942', '#FFFFFF', '#B31942', '#FFFFFF', '#B31942', '#FFFFFF', '#B31942', '#FFFFFF', '#B31942'] },
    canton: { c: '#0A3161', w: 0.4, h: 7 / 13, star: '#FFFFFF' } },
  { code: 'VN', name: 'Vietnam', bg: '#DA251D', star: { c: '#FFFF00', cx: 0.5, cy: 0.5, r: 0.3 } },
];

/** Alphabetical, so the picker reads the way a list of countries should. */
export const COUNTRIES: Country[] = [...RAW].sort((a, b) => a.name.localeCompare(b.name, 'en'));

export const countryByCode = (code: string) => COUNTRIES.find((c) => c.code === code) ?? null;

/** The text drawn on the cloth for a chapter. */
export const chapterText = (c: Country) => (c.banner ?? c.name).toUpperCase();

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const fn = i === 0 ? 'moveTo' : 'lineTo';
    ctx[fn](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

function bands(ctx: CanvasRenderingContext2D, b: Band, x: number, y: number, w: number, h: number, vertical: boolean) {
  const weights = b.weights ?? b.colors.map(() => 1);
  const total = weights.reduce((a, c) => a + c, 0);
  let cursor = 0;
  b.colors.forEach((c, i) => {
    const span = ((vertical ? w : h) * weights[i]) / total;
    ctx.fillStyle = c;
    if (vertical) ctx.fillRect(x + cursor, y, span + 0.6, h);
    else ctx.fillRect(x, y + cursor, w, span + 0.6);
    cursor += span;
  });
}

/** Two saltires and an upright cross — the union flag, at banner size. */
function unionFlag(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const diag = () => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.moveTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.stroke();
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.lineCap = 'square';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = h * 0.3;
  diag();
  ctx.strokeStyle = '#C8102E';
  ctx.lineWidth = h * 0.13;
  diag();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y + h / 2 - h * 0.19, w, h * 0.38);
  ctx.fillRect(x + w / 2 - h * 0.19, y, h * 0.38, h);
  ctx.fillStyle = '#C8102E';
  ctx.fillRect(x, y + h / 2 - h * 0.11, w, h * 0.22);
  ctx.fillRect(x + w / 2 - h * 0.11, y, h * 0.22, h);
  ctx.restore();
}

/** Simplified eleven-point maple leaf. */
function mapleLeaf(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, colour: string) {
  const pts: [number, number][] = [
    [0, -1], [0.16, -0.58], [0.42, -0.64], [0.34, -0.4], [0.72, -0.1],
    [0.6, 0.02], [0.66, 0.28], [0.3, 0.22], [0.24, 0.34], [0.08, 0.16],
    [0.12, 0.8], [-0.12, 0.8], [-0.08, 0.16], [-0.24, 0.34], [-0.3, 0.22],
    [-0.66, 0.28], [-0.6, 0.02], [-0.72, -0.1], [-0.34, -0.4], [-0.42, -0.64],
    [-0.16, -0.58],
  ];
  ctx.fillStyle = colour;
  ctx.beginPath();
  pts.forEach(([px, py], i) => {
    const X = cx + px * s;
    const Y = cy + py * s;
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  });
  ctx.closePath();
  ctx.fill();
}

function taegeuk(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = '#CD2E3A';
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, 0);
  ctx.arc(r / 2, 0, r / 2, 0, Math.PI, true);
  ctx.arc(-r / 2, 0, r / 2, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0047A0';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI);
  ctx.arc(-r / 2, 0, r / 2, Math.PI, 0, true);
  ctx.arc(r / 2, 0, r / 2, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Draw a flag into the rect, with a hairline border so white flags read. */
export function drawFlag(ctx: CanvasRenderingContext2D, def: Country, x: number, y: number, w: number, h: number) {
  const S = Math.min(w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  ctx.fillStyle = def.bg ?? '#FFFFFF';
  ctx.fillRect(x, y, w, h);
  if (def.h) bands(ctx, def.h, x, y, w, h, false);
  if (def.v) bands(ctx, def.v, x, y, w, h, true);
  if (def.diagonal) {
    const dg = def.diagonal;
    ctx.fillStyle = dg.tri[0];
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = dg.tri[1];
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.lineCap = 'square';
    if (dg.fim) {
      ctx.strokeStyle = dg.fim;
      ctx.lineWidth = h * dg.t;
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = dg.c;
    ctx.lineWidth = h * dg.t * 0.62;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y);
    ctx.stroke();
  }
  if (def.union) unionFlag(ctx, x, y, w, h);
  if (def.unionCanton) {
    unionFlag(ctx, x, y, w * def.unionCanton.w, h * def.unionCanton.h);
  }

  if (def.hoistBar) {
    ctx.fillStyle = def.hoistBar.c;
    ctx.fillRect(x, y, w * def.hoistBar.w, h);
  }
  if (def.hoistTri && def.hoistTri.w > 0) {
    ctx.fillStyle = def.hoistTri.c;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w * def.hoistTri.w, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
  }
  if (def.cross) {
    const t = h * def.cross.t;
    const cx = x + w * 0.36;
    if (def.cross.fim) {
      ctx.fillStyle = def.cross.fim;
      ctx.fillRect(x, y + h / 2 - t * 0.85, w, t * 1.7);
      ctx.fillRect(cx - t * 0.85, y, t * 1.7, h);
    }
    ctx.fillStyle = def.cross.c;
    ctx.fillRect(x, y + h / 2 - t / 2, w, t);
    ctx.fillRect(cx - t / 2, y, t, h);
  }
  if (def.canton) {
    const cw = w * def.canton.w;
    const ch = h * def.canton.h;
    ctx.fillStyle = def.canton.c;
    ctx.fillRect(x, y, cw, ch);
    // A readable suggestion of the star field; individual stars would be
    // sub-pixel at the size this renders on the cloth.
    ctx.fillStyle = def.canton.star;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        starPath(ctx, x + cw * (0.18 + c * 0.22), y + ch * (0.22 + r * 0.28), Math.max(0.8, S * 0.045));
      }
    }
  }
  if (def.rhombus) {
    ctx.fillStyle = def.rhombus.c;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y + h * (1 - def.rhombus.h) / 2);
    ctx.lineTo(x + w * (1 + def.rhombus.w) / 2, y + h / 2);
    ctx.lineTo(x + w / 2, y + h * (1 + def.rhombus.h) / 2);
    ctx.lineTo(x + w * (1 - def.rhombus.w) / 2, y + h / 2);
    ctx.closePath();
    ctx.fill();
  }
  if (def.disc) {
    ctx.fillStyle = def.disc.c;
    ctx.beginPath();
    ctx.arc(x + w * def.disc.cx, y + h * (def.disc.cy ?? 0.5), S * def.disc.r, 0, Math.PI * 2);
    ctx.fill();
  }
  if (def.crescent) {
    const cr = def.crescent;
    const r = S * cr.r;
    ctx.fillStyle = cr.c;
    ctx.beginPath();
    ctx.arc(x + w * cr.cx, y + h * cr.cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Carve the inner curve with the colour sitting behind it.
    ctx.fillStyle = cr.bite;
    ctx.beginPath();
    ctx.arc(x + w * cr.cx + r * cr.offset * 2.4, y + h * cr.cy, r * 0.86, 0, Math.PI * 2);
    ctx.fill();
  }
  if (def.maple) mapleLeaf(ctx, x + w / 2, y + h / 2, h * 0.42, def.maple.c);
  if (def.taegeuk) taegeuk(ctx, x + w / 2, y + h / 2, S * 0.3);
  for (const s of def.stars ?? []) {
    ctx.fillStyle = s.c;
    starPath(ctx, x + w * s.cx, y + h * s.cy, S * s.r, s.points);
  }
  if (def.star) {
    ctx.fillStyle = def.star.c;
    starPath(ctx, x + w * def.star.cx, y + h * def.star.cy, S * def.star.r, def.star.points);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(27,49,88,0.55)';
  ctx.lineWidth = Math.max(1, h * 0.05);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}
