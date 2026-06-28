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
 * Локальная дата в формате YYYY-MM-DD.
 * НЕ использовать `new Date().toISOString().slice(0,10)` — он даёт дату в UTC,
 * из-за чего поздним вечером (МСК = UTC+3) «сегодня» сдвигается на вчера.
 * Здесь берутся локальные компоненты даты браузера пользователя.
 */
export function toLocalYmd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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

// Группирует разряды по 3 неразрывными пробелами: "1 200 000,50".
// Принимает число или строку с любыми разделителями.
export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(num)) return '';
  const fixed = Math.abs(num % 1) > 1e-9 ? num.toFixed(2) : String(Math.trunc(num));
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decPart ? `${grouped},${decPart}` : grouped;
}

// Обратное: "1 200 000,50" → 1200000.5; пустая строка → 0.
export function parseMoney(str: string | null | undefined): number {
  if (!str) return 0;
  const cleaned = String(str).replace(/[\s ]/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
