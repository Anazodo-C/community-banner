import type { Point, Slot, Template } from '../types/template';
import { MIN_HEAD_PX } from '../types/template';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  template: Template | null;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isPt = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]);

/**
 * Strip anything executable out of an imported SVG before it is allowed near
 * the DOM: scripts, event handlers, and any href that leaves the document.
 */
export function sanitizeSvg(svg: string): string {
  let s = svg.replace(/<\s*(script|foreignObject|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  s = s.replace(/<\s*(script|foreignObject|iframe|object|embed)\b[^>]*\/?>/gi, '');
  s = s.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  s = s.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  s = s.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  // Keep only same-document fragment references.
  s = s.replace(/\s(xlink:href|href)\s*=\s*("|')(?!#)[^"']*\2/gi, '');
  s = s.replace(/javascript:/gi, '');
  s = s.replace(/<!ENTITY[\s\S]*?>/gi, '');
  return s;
}

function validateSlot(raw: unknown, i: number, errors: string[], warnings: string[], canvasW: number): Slot | null {
  if (typeof raw !== 'object' || raw === null) {
    errors.push(`slots[${i}] is not an object.`);
    return null;
  }
  const s = raw as Record<string, unknown>;
  for (const k of ['id', 'x', 'y', 'r'] as const) {
    if (!isNum(s[k])) {
      errors.push(`slots[${i}].${k} must be a number.`);
      return null;
    }
  }
  const facing = s.facing;
  if (facing !== 'left' && facing !== 'right' && facing !== 'center') {
    errors.push(`slots[${i}].facing must be "left", "right" or "center".`);
    return null;
  }
  const x = s.x as number;
  const y = s.y as number;
  const r = s.r as number;
  if (x < 0 || x > 100 || y < 0 || y > 100) errors.push(`slots[${i}] centre is outside the canvas.`);
  if (r <= 0) errors.push(`slots[${i}].r must be positive.`);

  const headPx = (r / 100) * canvasW * 2;
  if (headPx < MIN_HEAD_PX) {
    warnings.push(
      `slots[${i}] ("${String(s.name ?? s.id)}") head is ${headPx.toFixed(0)}px. ` +
        `The design note asks for ${MIN_HEAD_PX}px+ so a portrait stays readable on mobile.`,
    );
  }
  return {
    id: s.id as number,
    name: typeof s.name === 'string' ? s.name : `Slot ${s.id}`,
    x,
    y,
    r,
    ratio: isNum(s.ratio) ? s.ratio : undefined,
    facing,
  };
}

/**
 * Validate an imported template.
 *
 * Sub-80px heads are reported as warnings rather than rejections: this build
 * ships a template whose head slots follow the illustration's own scale, and
 * refusing to load it would refuse the default. The warning still surfaces in
 * the UI so an author knows what they are trading away.
 */
export function validateTemplate(input: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof input !== 'object' || input === null) {
    return { ok: false, errors: ['Template must be a JSON object.'], warnings, template: null };
  }
  const t = input as Record<string, unknown>;

  if (t.schema !== 2) errors.push('Unsupported schema. This build reads schema 2.');
  if (typeof t.id !== 'string' || !t.id) errors.push('id must be a non-empty string.');
  if (typeof t.name !== 'string' || !t.name) errors.push('name must be a non-empty string.');
  if (typeof t.background !== 'string' || !t.background) errors.push('background must be a URL or data ref.');
  if (typeof t.background === 'string' && /^\s*javascript:/i.test(t.background)) {
    errors.push('background must not be a javascript: URL.');
  }

  const canvas = t.canvas as Record<string, unknown> | undefined;
  if (!canvas || !isNum(canvas.w) || !isNum(canvas.h)) errors.push('canvas must be { w, h }.');
  const canvasW = isNum(canvas?.w) ? (canvas!.w as number) : 1500;
  const canvasH = isNum(canvas?.h) ? (canvas!.h as number) : 500;
  if (canvasW / canvasH !== 3) warnings.push('Canvas is not 3:1. X headers are 1500x500.');

  if (!Array.isArray(t.slots) || t.slots.length === 0) errors.push('slots must be a non-empty array.');
  const slots: Slot[] = [];
  if (Array.isArray(t.slots)) {
    if (t.slots.length > 6) warnings.push('More than six slots; the picker shows all of them but the scene gets crowded.');
    t.slots.forEach((s, i) => {
      const v = validateSlot(s, i, errors, warnings, canvasW);
      if (v) slots.push(v);
    });
    const ids = new Set(slots.map((s) => s.id));
    if (ids.size !== slots.length) errors.push('Slot ids must be unique.');
  }

  const chapter = t.chapter as Record<string, unknown> | undefined;
  if (!chapter) {
    errors.push('chapter is required.');
  } else {
    const path = chapter.path;
    if (!Array.isArray(path) || path.length < 2 || !path.every(isPt)) {
      errors.push('chapter.path must be at least two [x, y] points.');
    }
    if (chapter.flag !== null && chapter.flag !== undefined) {
      const f = chapter.flag as Record<string, unknown>;
      if (!isNum(f.w) || !isNum(f.h)) errors.push('chapter.flag must be { w, h } or null.');
    }
    if (typeof chapter.default !== 'string' || !/^[A-Za-z]{2}$/.test(chapter.default)) {
      errors.push('chapter.default must be a two-letter country code.');
    }
  }

  if (errors.length) return { ok: false, errors, warnings, template: null };

  return {
    ok: true,
    errors,
    warnings,
    template: {
      schema: 2,
      id: t.id as string,
      name: t.name as string,
      author: typeof t.author === 'string' ? t.author : 'Unknown',
      canvas: { w: canvasW, h: canvasH },
      background: t.background as string,
      slots,
      chapter: {
        path: (chapter!.path as Point[]).map((p) => [p[0], p[1]] as Point),
        flag:
          chapter!.flag && typeof chapter!.flag === 'object'
            ? {
                w: (chapter!.flag as Record<string, number>).w,
                h: (chapter!.flag as Record<string, number>).h,
              }
            : null,
        default: (chapter!.default as string).toUpperCase(),
      },
    },
  };
}
