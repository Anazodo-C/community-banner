import { useEffect, useRef } from 'react';
import type { RenderOpts } from '../lib/render';
import { renderToCanvas, slotPx } from '../lib/render';

interface Props {
  opts: RenderOpts;
  selected: number | null;
  onSelect: (id: number) => void;
  /** Draw the slot hotspots so a member can see what is clickable. */
  showHotspots: boolean;
}

export function BannerCanvas({ opts, selected, onSelect, showHotspots }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef<number>(0);

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const canvas = ref.current;
      if (!canvas) return;
      const { w, h } = opts.template.canvas;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(renderToCanvas(opts, 1), 0, 0);

      if (!showHotspots) return;
      for (const slot of opts.template.slots) {
        const st = opts.slots[slot.id];
        const { cx, cy, rx, ry } = slotPx(slot, opts.template, st?.scale ?? 1);
        const isSel = selected === slot.id;
        ctx.save();
        ctx.lineWidth = isSel ? 4 : 2.5;
        ctx.setLineDash(isSel ? [] : [7, 6]);
        ctx.strokeStyle = isSel ? '#F3966F' : 'rgba(253,240,220,0.85)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx * 1.5, ry * 1.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (!st?.image) {
          ctx.setLineDash([]);
          ctx.fillStyle = isSel ? '#F3966F' : 'rgba(27,49,88,0.9)';
          ctx.beginPath();
          ctx.arc(cx, cy - ry * 1.5 - 13, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = isSel ? '#1B3158' : '#FDF0DC';
          ctx.font = '700 15px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(slot.id), cx, cy - ry * 1.5 - 12);
        }
        ctx.restore();
      }
    });
    return () => cancelAnimationFrame(raf.current);
  }, [opts, selected, showHotspots]);

  const pick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * opts.template.canvas.w;
    const y = ((e.clientY - rect.top) / rect.height) * opts.template.canvas.h;

    let best: { id: number; d: number } | null = null;
    for (const slot of opts.template.slots) {
      const st = opts.slots[slot.id];
      const { cx, cy, rx, ry } = slotPx(slot, opts.template, st?.scale ?? 1);
      // Normalised distance, so the hit area follows the head oval.
      const d = Math.hypot((x - cx) / (rx * 2.2), (y - cy) / (ry * 2.2));
      if (d <= 1 && (!best || d < best.d)) best = { id: slot.id, d };
    }
    if (best) onSelect(best.id);
  };

  return (
    <canvas
      ref={ref}
      className="banner-canvas"
      onClick={pick}
      role="img"
      aria-label="Banner preview. Click a highlighted face to choose your slot."
    />
  );
}
