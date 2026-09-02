import type { Slot, Template } from '../types/template';
import { MIN_HEAD_PX } from '../types/template';
import { readFaces } from './face';
import { loadImage, readFileAsDataUrl } from './image';

export interface SceneImport {
  template: Template;
  warnings: string[];
}

/** Where the chapter sits on a scene we know nothing about. */
const DEFAULT_PATH: [number, number][] = [
  [10, 22], [18, 20.5], [26, 19.5], [34, 20], [42, 21],
];

/**
 * Turn a picture into a template.
 *
 * The image is cover-fitted to the canvas so it exports at the right size
 * whatever shape it arrived in, then searched for faces, each of which becomes
 * a slot. Detection is trained on photographs, so an illustration usually
 * yields nothing — in that case the template still loads, with one slot in the
 * middle and a warning saying to move it, which is more useful than refusing
 * the import.
 */
export async function sceneToTemplate(file: File, canvasW = 1500, canvasH = 500): Promise<SceneImport> {
  const warnings: string[] = [];
  const img = await loadImage(await readFileAsDataUrl(file));

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable.');

  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const k = Math.max(canvasW / iw, canvasH / ih);
  const dw = iw * k;
  const dh = ih * k;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (canvasW - dw) / 2, (canvasH - dh) / 2, dw, dh);

  const ratio = iw / ih;
  if (Math.abs(ratio - canvasW / canvasH) > 0.25) {
    warnings.push(
      `That picture is ${ratio.toFixed(2)}:1 and the banner is 3:1, so it has been cropped to fit. ` +
        'Crop it yourself first if you want to choose what is lost.',
    );
  }

  const faces = await readFaces(canvas, 6);
  const slots: Slot[] = faces
    .sort((a, b) => a.cx - b.cx)
    .slice(0, 6)
    .map((f, i) => ({
      id: i + 1,
      name: `Face ${i + 1}`,
      x: (f.cx / canvasW) * 100,
      y: (f.cy / canvasH) * 100,
      r: (f.rx / canvasW) * 100,
      ratio: f.rx > 0 ? f.ry / f.rx : 1.25,
      facing: f.facing,
    }));

  if (!slots.length) {
    warnings.push(
      'No faces were found in that picture — detection only works on photographs, not drawings. ' +
        'One slot has been placed in the middle: export the template, move it over a face, and import it back.',
    );
    slots.push({ id: 1, name: 'Face 1', x: 50, y: 55, r: 3, ratio: 1.25, facing: 'center' });
  } else {
    const small = slots.filter((s) => (s.r / 100) * canvasW * 2 < MIN_HEAD_PX).length;
    if (small) {
      warnings.push(
        `${small} of ${slots.length} detected ${small === 1 ? 'face is' : 'faces are'} under ` +
          `${MIN_HEAD_PX}px across, so an uploaded portrait will read small there.`,
      );
    }
    warnings.push(
      `Found ${slots.length} ${slots.length === 1 ? 'face' : 'faces'}. Export the template if you want ` +
        'to rename the slots or nudge them.',
    );
  }

  return {
    template: {
      schema: 2,
      id: `scene-${Date.now().toString(36)}`,
      name: file.name.replace(/\.[^.]+$/, '').slice(0, 48) || 'Imported scene',
      author: 'Imported',
      canvas: { w: canvasW, h: canvasH },
      background: canvas.toDataURL('image/png'),
      slots,
      chapter: { path: DEFAULT_PATH.map(([x, y]) => [x, y] as [number, number]), flag: { w: 3.47, h: 7.2 }, default: 'NG' },
    },
    warnings,
  };
}
