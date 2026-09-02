export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${src}`));
    img.src = src;
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('Could not read that file.'));
    fr.readAsDataURL(file);
  });
}

/**
 * Rasterise an SVG through a data: URL so the canvas is never tainted and
 * toBlob keeps working. The paths are used exactly as supplied.
 */
export async function loadSvgAsImage(url: string): Promise<HTMLImageElement> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url}`);
  const text = await res.text();
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
  return loadImage(dataUrl);
}

/** Downscale very large uploads so detection and compositing stay quick. */
export async function normaliseUpload(dataUrl: string, maxSide = 1400): Promise<HTMLImageElement> {
  const img = await loadImage(dataUrl);
  const side = Math.max(img.naturalWidth, img.naturalHeight);
  if (side <= maxSide) return img;
  const k = maxSide / side;
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  const ctx = c.getContext('2d');
  if (!ctx) return img;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return loadImage(c.toDataURL('image/png'));
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed.'))), type);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
