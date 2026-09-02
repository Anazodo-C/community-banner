import { renderToCanvas, type RenderOpts } from './render';

export interface GifProgress {
  (done: number, total: number): void;
}

/** Encode the looping banner. */
export async function encodeGif(
  base: RenderOpts,
  onProgress: GifProgress,
  frameCount = 16,
  delay = 190,
): Promise<Blob> {
  const { w, h } = base.template.canvas;
  const frames: ArrayBuffer[] = [];

  for (let i = 0; i < frameCount; i++) {
    const canvas = renderToCanvas({ ...base, phase: i / frameCount }, 2);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    frames.push(ctx.getImageData(0, 0, w, h).data.buffer);
    onProgress(i + 1, frameCount + 2);
    // Yield so the tab stays responsive while frames are rasterised.
    await new Promise((r) => setTimeout(r, 0));
  }

  const run = (maxColors: number) =>
    new Promise<Uint8Array>((resolve, reject) => {
      const worker = new Worker(new URL('./gifWorker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        const d = e.data;
        if (d.type === 'progress') onProgress(frameCount + 1, frameCount + 2);
        if (d.type === 'done') {
          worker.terminate();
          resolve(d.bytes as Uint8Array);
        }
        if (d.type === 'error') {
          worker.terminate();
          reject(new Error(d.message));
        }
      };
      worker.onerror = (err) => {
        worker.terminate();
        reject(new Error(err.message || 'GIF worker failed.'));
      };
      // Cloned rather than transferred: a second, tighter-palette pass needs
      // the same frames again if the first comes back over 5MB.
      worker.postMessage({ frames, width: w, height: h, delay, maxColors });
    });

  let bytes = await run(256);
  if (bytes.byteLength > 5 * 1024 * 1024) {
    // Second pass with a tighter palette rather than shipping an oversized file.
    bytes = await run(96);
  }
  onProgress(frameCount + 2, frameCount + 2);
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buf], { type: 'image/gif' });
}
