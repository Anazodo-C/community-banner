/**
 * Template schema v2.
 *
 * Coordinates are percentages of canvas width (x, r) and height (y) so a
 * template survives a change of export size. Everything renders into a
 * 1500x500 3:1 canvas.
 *
 * Changed from v1: the handle plate and the logo plate are gone, and the
 * chapter's four-corner quad plus quadratic control point are replaced by an
 * explicit centreline `path`. The towed cloth in the artwork waves rather than
 * bowing once, and no single-control curve tracks it closer than about 14px —
 * a measured polyline tracks it to under one.
 */

export type Facing = 'left' | 'right' | 'center';

export type Point = [number, number];

export interface Slot {
  id: number;
  /** Label shown in the slot picker. */
  name: string;
  /** % of canvas width — horizontal centre of the painted head. */
  x: number;
  /** % of canvas height — vertical centre of the painted head. */
  y: number;
  /** % of canvas width — horizontal radius of the painted head. */
  r: number;
  /** ry / rx. Faces are ovals; 1 is a circle. Optional, defaults to 1.25. */
  ratio?: number;
  /** Which way the painted figure looks. Uploads are flipped to match. */
  facing: Facing;
}

export interface ChapterField {
  /**
   * Centreline the chapter text is laid along, as [x%, y%] points running
   * left to right. Two points give a straight baseline; more track a curve.
   */
  path: Point[];
  /** Flag drawn at the leading edge of the cloth, sized in canvas percent. */
  flag: { w: number; h: number } | null;
  /** ISO 3166-1 alpha-2 code of the chapter shown on first load. */
  default: string;
}

export interface Template {
  schema: 2;
  id: string;
  name: string;
  author: string;
  canvas: { w: number; h: number };
  /** Background raster: a URL, or a data: ref for imported templates. */
  background: string;
  slots: Slot[];
  chapter: ChapterField;
}

/** Runtime state for one slot. */
export interface SlotState {
  image: HTMLImageElement | null;
  /** Manual flip override. null = use detection. */
  flip: boolean | null;
  /** Detection result, for display. */
  detected: {
    ok: boolean;
    yaw: number | null;
    roll: number;
    /** Eye midpoint and interocular distance in source-image pixels. */
    eyeMid: { x: number; y: number } | null;
    interocular: number | null;
    message: string;
  } | null;
  /** Member-controlled size nudge relative to the painted head. */
  scale: number;
  /** Member-controlled nudge in slot radii. */
  offsetX: number;
  offsetY: number;
}

export const MIN_HEAD_PX = 80;
