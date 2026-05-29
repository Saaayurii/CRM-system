// Dynamic tab signals: a numbered badge drawn over the favicon, plus a
// flashing document.title — so unread notifications are visible even when the
// CRM tab is in the background.

const ORIGINAL_FAVICON = '/favicon.png';

let baseImage: HTMLImageElement | null = null;
let baseImageLoaded = false;
let currentBadgeCount = -1;

function getFaviconLink(): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null;
  let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  return link;
}

function ensureBaseImage(onReady: () => void): void {
  if (baseImageLoaded && baseImage) {
    onReady();
    return;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    baseImage = img;
    baseImageLoaded = true;
    onReady();
  };
  img.onerror = () => {
    baseImageLoaded = false;
  };
  img.src = ORIGINAL_FAVICON;
}

/** Draw the unread count as a red badge over the favicon (or restore it at 0). */
export function setFaviconBadge(count: number): void {
  if (typeof document === 'undefined') return;
  if (count === currentBadgeCount) return;
  currentBadgeCount = count;

  const link = getFaviconLink();
  if (!link) return;

  if (count <= 0) {
    link.href = ORIGINAL_FAVICON;
    return;
  }

  ensureBaseImage(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (baseImage) ctx.drawImage(baseImage, 0, 0, size, size);

    const label = count > 99 ? '99+' : String(count);
    const r = label.length > 2 ? 22 : 19;
    const cx = size - r - 2;
    const cy = r + 2;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${label.length > 2 ? 26 : 32}px -apple-system, Segoe UI, Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy + 1);

    link.href = canvas.toDataURL('image/png');
  });
}

// ─── Flashing title ──────────────────────────────────────────────────────────

let flashTimer: ReturnType<typeof setInterval> | null = null;
let originalTitle = '';
let toggled = false;

/** Alternate the tab title with an alert until stopTitleFlash() is called. */
export function startTitleFlash(message: string): void {
  if (typeof document === 'undefined') return;
  if (flashTimer) return; // already flashing
  originalTitle = document.title;
  toggled = false;
  flashTimer = setInterval(() => {
    document.title = toggled ? originalTitle : message;
    toggled = !toggled;
  }, 1200);
}

export function stopTitleFlash(): void {
  if (typeof document === 'undefined') return;
  if (flashTimer) {
    clearInterval(flashTimer);
    flashTimer = null;
  }
  if (originalTitle) document.title = originalTitle;
}
