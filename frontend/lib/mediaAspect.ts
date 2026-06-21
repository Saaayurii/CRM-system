/**
 * Client-side cache of media (image/video) pixel dimensions, keyed by file URL.
 *
 * Chat attachments don't carry width/height, so a single image/video renders at
 * natural size only after it loads — which shifts the message list (jump on iOS).
 * We remember dimensions the first time a file loads (in memory + localStorage)
 * and reserve the exact box on every later render/open, so there's no reflow.
 * First-ever view of a given file can still shift; everything after is stable.
 */

const MEM = new Map<string, { w: number; h: number }>();
const LS_KEY = 'crm-media-dims';
const MAX_ENTRIES = 500;

let lsLoaded = false;

function loadLs(): void {
  if (lsLoaded || typeof window === 'undefined') return;
  lsLoaded = true;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw) as Record<string, [number, number]>;
    for (const [url, [w, h]] of Object.entries(obj)) MEM.set(url, { w, h });
  } catch {
    /* ignore corrupt cache */
  }
}

function saveLs(): void {
  if (typeof window === 'undefined') return;
  try {
    // Keep only the most recent MAX_ENTRIES to bound localStorage growth.
    const entries = [...MEM.entries()].slice(-MAX_ENTRIES);
    const obj: Record<string, [number, number]> = {};
    for (const [url, { w, h }] of entries) obj[url] = [w, h];
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  } catch {
    /* quota / disabled — non-fatal */
  }
}

/** Remembered dimensions for a file URL, or undefined if not seen yet. */
export function getMediaDims(url: string | undefined): { w: number; h: number } | undefined {
  if (!url) return undefined;
  loadLs();
  return MEM.get(url);
}

/** Record dimensions discovered when the media element loaded. */
export function setMediaDims(url: string | undefined, w: number, h: number): void {
  if (!url || !w || !h) return;
  loadLs();
  const prev = MEM.get(url);
  if (prev && prev.w === w && prev.h === h) return;
  MEM.set(url, { w, h });
  saveLs();
}

/**
 * Compute a display box (no crop) for known dimensions, fitted within max bounds.
 * Returns null when dimensions are unknown (caller falls back to natural sizing).
 */
export function reservedBox(
  url: string | undefined,
  maxW = 320,
  maxH = 320,
): { width: number; height: number } | null {
  const dims = getMediaDims(url);
  if (!dims) return null;
  const scale = Math.min(maxW / dims.w, maxH / dims.h, 1);
  return { width: Math.round(dims.w * scale), height: Math.round(dims.h * scale) };
}
