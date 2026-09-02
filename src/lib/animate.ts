import { loadImage } from './image';

export interface AnimSprite {
  img: HTMLImageElement;
  /** Top-left of the sprite on the 1500x500 canvas. */
  x: number;
  y: number;
  /** Joint the sprite rotates about, in canvas coordinates. */
  pivotX: number;
  pivotY: number;
}

export interface AnimAssets {
  /** The scene with every moving part erased. */
  plate: HTMLImageElement;
  bridgeArm: AnimSprite;
  hiFiveLeft: AnimSprite;
  hiFiveRight: AnimSprite;
}

/**
 * Sprite placement, measured off the artwork and produced by
 * tools/build-animation.py. Pivots are the joints each limb turns about: the
 * bridge lead's shoulder, and an elbow each for the two figures high-fiving.
 */
const PLACEMENT = {
  bridgeArm: { x: 350, y: 229, pivotX: 412, pivotY: 246 },
  hiFiveLeft: { x: 855, y: 296, pivotX: 860, pivotY: 334 },
  hiFiveRight: { x: 881, y: 296, pivotX: 906, pivotY: 336 },
};

/** The rotor, measured off the painted blade it replaces. */
const ROTOR = {
  hubX: 812,
  hubY: 39,
  /** Blade length in canvas pixels. */
  len: 92,
  /** How flat the disc reads from this viewing angle. */
  squash: 0.1,
  /** The rotor plane is drawn tilted; the left tip sits higher than the right. */
  tilt: 0.078,
  /**
   * Half-turns per loop. A two-bladed rotor repeats every half turn, so an odd
   * multiple of PI keeps the loop seamless while still reading as fast.
   */
  turns: 3,
};

export async function loadAnimAssets(base: string): Promise<AnimAssets> {
  const [plate, arm, hl, hr] = await Promise.all([
    loadImage(base + 'templates/city-anim-plate.png'),
    loadImage(base + 'templates/anim-bridge-arm.png'),
    loadImage(base + 'templates/anim-hifive-left.png'),
    loadImage(base + 'templates/anim-hifive-right.png'),
  ]);
  return {
    plate,
    bridgeArm: { img: arm, ...PLACEMENT.bridgeArm },
    hiFiveLeft: { img: hl, ...PLACEMENT.hiFiveLeft },
    hiFiveRight: { img: hr, ...PLACEMENT.hiFiveRight },
  };
}

function drawLimb(ctx: CanvasRenderingContext2D, s: AnimSprite, angle: number) {
  ctx.save();
  ctx.translate(s.pivotX, s.pivotY);
  ctx.rotate(angle);
  ctx.translate(-s.pivotX, -s.pivotY);
  ctx.drawImage(s.img, s.x, s.y);
  ctx.restore();
}

/**
 * The main rotor, redrawn as vectors.
 *
 * The illustration has a single blade painted nearly edge-on, which cannot be
 * spun by transforming it, so the blade is erased from the plate and the disc
 * is drawn here instead: a faint swept ellipse for the blur, and two blades
 * projected onto that ellipse for the strobe that reads as rotation.
 */
function drawRotor(ctx: CanvasRenderingContext2D, phase: number) {
  const { hubX, hubY, len, squash, tilt, turns } = ROTOR;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const project = (theta: number, t: number) => {
    const lx = Math.cos(theta) * len * t;
    const ly = Math.sin(theta) * len * squash * t;
    return { x: hubX + lx * cosT - ly * sinT, y: hubY + lx * sinT + ly * cosT };
  };

  ctx.save();

  // The swept disc.
  ctx.globalAlpha = 0.17;
  ctx.fillStyle = '#2A3140';
  ctx.beginPath();
  ctx.ellipse(hubX, hubY, len, len * squash + 1.6, tilt, 0, Math.PI * 2);
  ctx.fill();

  // Two blades, half a turn apart.
  ctx.globalAlpha = 0.92;
  const angle = phase * Math.PI * turns;
  for (let b = 0; b < 2; b++) {
    const th = angle + b * Math.PI;
    const root = project(th, 0.06);
    const tip = project(th, 1);
    const mid = project(th, 0.55);
    ctx.fillStyle = '#242B38';
    ctx.beginPath();
    ctx.moveTo(root.x, root.y - 3.4);
    ctx.quadraticCurveTo(mid.x, mid.y - 2.6, tip.x, tip.y - 1.1);
    ctx.lineTo(tip.x, tip.y + 1.1);
    ctx.quadraticCurveTo(mid.x, mid.y + 2.6, root.x, root.y + 3.4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Everything that moves, for one position in the loop.
 *
 * `phase` runs 0..1. Every motion completes a whole number of cycles across
 * that range so the GIF loops without a jump.
 */
export function drawAnimation(ctx: CanvasRenderingContext2D, a: AnimAssets, phase: number) {
  const tau = Math.PI * 2;

  // Two beckons per loop: the arm lifts and drops, waving the walkers over.
  const beckon = 0.5 - 0.5 * Math.cos(tau * phase * 2);
  drawLimb(ctx, a.bridgeArm, 0.2 * beckon);

  // Two claps per loop. Zero is palms together, so the pair starts joined,
  // draws apart, and comes back together.
  const apart = 0.5 - 0.5 * Math.cos(tau * phase * 2);
  drawLimb(ctx, a.hiFiveLeft, -0.17 * apart);
  drawLimb(ctx, a.hiFiveRight, 0.17 * apart);

  drawRotor(ctx, phase);
}
