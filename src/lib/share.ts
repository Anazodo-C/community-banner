/**
 * Share links carry configuration only. Uploaded portraits stay on the
 * member's device and are never encoded into the URL — a banner's worth of
 * image data does not survive a URL, and putting someone's face in a link
 * they might paste into a group chat is not a thing to do by default.
 */

export interface ShareConfig {
  template: string;
  slot: number | null;
  /** ISO 3166-1 alpha-2 code of the chapter. */
  country: string;
}

export function encodeShare(c: ShareConfig): string {
  const p = new URLSearchParams();
  p.set('v', '1');
  p.set('t', c.template);
  if (c.slot !== null) p.set('s', String(c.slot));
  if (c.country) p.set('cc', c.country);
  return '#' + p.toString();
}

export function decodeShare(hash: string): Partial<ShareConfig> {
  const raw = hash.replace(/^#/, '');
  if (!raw) return {};
  const p = new URLSearchParams(raw);
  if (p.get('v') !== '1') return {};
  const out: Partial<ShareConfig> = {};
  const t = p.get('t');
  const s = p.get('s');
  const cc = p.get('cc');
  if (t) out.template = t.slice(0, 64);
  if (s !== null && /^\d+$/.test(s)) out.slot = Number(s);
  if (cc && /^[A-Za-z]{2}$/.test(cc)) out.country = cc.toUpperCase();
  return out;
}

export function shareUrl(c: ShareConfig): string {
  const base = window.location.origin + window.location.pathname;
  return base + encodeShare(c);
}

/** Exports must not carry the fragment; strip it once a banner is saved. */
export function stripFragment() {
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}
