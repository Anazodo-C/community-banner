import type { Facing } from '../types/template';

export interface FaceReading {
  ok: boolean;
  /** Positive = the subject looks toward image-left. Null when unknown. */
  yaw: number | null;
  /** Radians. Rotate by -roll to level the eyes. */
  roll: number;
  eyeMid: { x: number; y: number } | null;
  interocular: number | null;
  message: string;
}

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/** MediaPipe face-mesh indices. */
const NOSE_TIP = 1;
const R_EYE_OUTER = 33;   // subject's right eye — appears image-left
const R_EYE_INNER = 133;
const L_EYE_INNER = 362;
const L_EYE_OUTER = 263;  // subject's left eye — appears image-right

/** Below this the head is treated as facing the camera and left unflipped. */
export const YAW_THRESHOLD = 0.06;

type Landmarker = { detect: (img: HTMLImageElement | HTMLCanvasElement) => { faceLandmarks: { x: number; y: number }[][] } };

const landmarkerPromises = new Map<number, Promise<Landmarker | null>>();

/**
 * Lazily load a landmarker for a given face count. Resolves to null (never
 * rejects) when the model or wasm is unreachable, so a blocked CDN degrades to
 * centre-cropping rather than breaking upload.
 *
 * Portrait uploads want one face and scene imports want several, and the count
 * is fixed when the graph is built, so one instance is kept per count.
 */
export function loadLandmarker(numFaces = 1): Promise<Landmarker | null> {
  const cached = landmarkerPromises.get(numFaces);
  if (cached) return cached;
  const p = (async () => {
    for (const delegate of ['GPU', 'CPU'] as const) {
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
        const lm = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL, delegate },
          runningMode: 'IMAGE',
          numFaces,
        });
        return lm as unknown as Landmarker;
      } catch {
        // Fall through to the next delegate, then give up.
      }
    }
    return null;
  })();
  landmarkerPromises.set(numFaces, p);
  return p;
}

export interface SceneFace {
  /** Face bounds in source-image pixels. */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  facing: Facing;
}

/**
 * Find every face in a scene, for turning an imported picture into a template.
 * Returns an empty list rather than throwing when nothing is found — including
 * for illustrations, which the model is not trained on.
 */
export async function readFaces(
  img: HTMLImageElement | HTMLCanvasElement,
  max = 6,
): Promise<SceneFace[]> {
  const lm = await loadLandmarker(max);
  if (!lm) return [];
  let faces: { x: number; y: number }[][] | undefined;
  try {
    faces = lm.detect(img).faceLandmarks;
  } catch {
    return [];
  }
  if (!faces?.length) return [];

  const W = 'naturalWidth' in img ? img.naturalWidth || img.width : img.width;
  const H = 'naturalHeight' in img ? img.naturalHeight || img.height : img.height;

  return faces.map((pts) => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const nose = pts[NOSE_TIP];
    const dLeft = Math.abs(nose.x - pts[R_EYE_OUTER].x);
    const dRight = Math.abs(nose.x - pts[L_EYE_OUTER].x);
    const sum = dLeft + dRight;
    const yaw = sum > 0 ? (dRight - dLeft) / sum : 0;
    return {
      cx: ((minX + maxX) / 2) * W,
      cy: ((minY + maxY) / 2) * H,
      rx: ((maxX - minX) / 2) * W,
      ry: ((maxY - minY) / 2) * H,
      facing: yaw > YAW_THRESHOLD ? 'left' : yaw < -YAW_THRESHOLD ? 'right' : 'center',
    };
  });
}

const NO_FACE: FaceReading = {
  ok: false,
  yaw: null,
  roll: 0,
  eyeMid: null,
  interocular: null,
  message: 'No face found — centred the photo instead. Use flip and the nudges to adjust.',
};

export async function readFace(img: HTMLImageElement): Promise<FaceReading> {
  const lm = await loadLandmarker();
  if (!lm) {
    return { ...NO_FACE, message: 'Face model unavailable — centred the photo. Flip manually if needed.' };
  }

  let pts: { x: number; y: number }[] | undefined;
  try {
    pts = lm.detect(img).faceLandmarks?.[0];
  } catch {
    return { ...NO_FACE, message: 'Could not read that photo — centred it instead.' };
  }
  if (!pts || pts.length < 468) return NO_FACE;

  const W = img.naturalWidth || img.width;
  const H = img.naturalHeight || img.height;
  const P = (i: number) => ({ x: pts![i].x * W, y: pts![i].y * H });

  const rOuter = P(R_EYE_OUTER);
  const rInner = P(R_EYE_INNER);
  const lInner = P(L_EYE_INNER);
  const lOuter = P(L_EYE_OUTER);
  const nose = P(NOSE_TIP);

  const rEye = { x: (rOuter.x + rInner.x) / 2, y: (rOuter.y + rInner.y) / 2 };
  const lEye = { x: (lOuter.x + lInner.x) / 2, y: (lOuter.y + lInner.y) / 2 };

  const interocular = Math.hypot(lEye.x - rEye.x, lEye.y - rEye.y);
  const eyeMid = { x: (lEye.x + rEye.x) / 2, y: (lEye.y + rEye.y) / 2 };
  const roll = Math.atan2(lEye.y - rEye.y, lEye.x - rEye.x);

  // Yaw from nose-to-outer-corner asymmetry, as a normalised ratio so it
  // survives any scale of input photo.
  const dImageLeft = Math.abs(nose.x - rOuter.x);
  const dImageRight = Math.abs(nose.x - lOuter.x);
  const sum = dImageLeft + dImageRight;
  const yaw = sum > 1 ? (dImageRight - dImageLeft) / sum : 0;

  if (!interocular || interocular < 4) {
    return { ...NO_FACE, message: 'Face too small in that photo — try a closer crop.' };
  }

  return {
    ok: true,
    yaw,
    roll,
    eyeMid,
    interocular,
    message: 'Face found.',
  };
}

/** Which way the uploaded portrait looks. */
export function readingFacing(r: FaceReading): Facing {
  if (r.yaw === null) return 'center';
  if (r.yaw > YAW_THRESHOLD) return 'left';
  if (r.yaw < -YAW_THRESHOLD) return 'right';
  return 'center';
}

/**
 * Should the upload be mirrored to match the slot? A slot marked `center`, or
 * a portrait whose yaw is ambiguous, is left alone.
 */
export function shouldAutoFlip(r: FaceReading, slotFacing: Facing): boolean {
  if (slotFacing === 'center') return false;
  const f = readingFacing(r);
  if (f === 'center') return false;
  return f !== slotFacing;
}
