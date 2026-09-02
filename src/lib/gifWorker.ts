import { GIFEncoder, quantize, applyPalette } from 'gifenc';

interface Req {
  frames: ArrayBuffer[];
  width: number;
  height: number;
  delay: number;
  maxColors: number;
}

self.onmessage = (e: MessageEvent<Req>) => {
  const { frames, width, height, delay, maxColors } = e.data;
  try {
    const gif = GIFEncoder();
    for (let i = 0; i < frames.length; i++) {
      const data = new Uint8ClampedArray(frames[i]);
      const palette = quantize(data, maxColors);
      const index = applyPalette(data, palette);
      gif.writeFrame(index, width, height, { palette, delay });
      (self as unknown as Worker).postMessage({ type: 'progress', done: i + 1, total: frames.length });
    }
    gif.finish();
    const bytes = gif.bytes();
    (self as unknown as Worker).postMessage({ type: 'done', bytes }, [bytes.buffer]);
  } catch (err) {
    (self as unknown as Worker).postMessage({ type: 'error', message: String(err) });
  }
};
