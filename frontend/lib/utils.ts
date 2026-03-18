import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatValue = (value: number) =>
  Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumSignificantDigits: 3,
    notation: 'compact',
  }).format(value);

/**
 * Normalizes file URLs from the backend.
 * Old records in DB may have absolute URLs like http://localhost:3000/uploads/...
 * These cause Mixed Content errors when the app is served over HTTPS.
 * This function strips the origin and returns a relative path.
 */
export function normalizeFileUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Strip any absolute origin (http://localhost:3000, https://old-tunnel.trycloudflare.com, etc.)
  // and keep only the path starting with /uploads/
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/uploads/')) {
      return parsed.pathname;
    }
  } catch {
    // Not a valid absolute URL — already relative, return as-is
  }
  return url;
}

export const getCssVariable = (variable: string) => {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
};
