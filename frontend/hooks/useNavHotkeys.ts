'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface NavHotkey {
  /** Bare key as typed (e.g. '1', 's', 'q'). Lowercased on compare. */
  key: string;
  href: string;
  /** Required modifier combo. Default: 'alt' (just the Alt modifier). */
  modifier?: 'alt' | 'altShift' | 'ctrlAlt';
}

export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|Macintosh/.test(navigator.userAgent);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return false;
}

/**
 * Register Alt+key global shortcuts that navigate via Next router.
 * No-ops while the user is typing inside an input/textarea/contenteditable.
 */
export function useNavHotkeys(items: NavHotkey[]) {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const pressed = e.key.toLowerCase();
      for (const it of items) {
        const mod = it.modifier || 'alt';
        const altOk = mod === 'alt' ? (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey)
          : mod === 'altShift' ? (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey)
          : (e.altKey && e.ctrlKey && !e.shiftKey && !e.metaKey);
        if (!altOk) continue;
        if (pressed === it.key.toLowerCase()) {
          e.preventDefault();
          router.push(it.href);
          return;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items, router]);
}

/** Human-readable label for a hotkey — shows ⌥ symbols on macOS, Alt+ on other platforms. */
export function hotkeyLabel(item: NavHotkey): string {
  const mod = item.modifier || 'alt';
  if (isMac()) {
    const sym = mod === 'alt' ? '⌥' : mod === 'altShift' ? '⌥⇧' : '⌃⌥';
    return `${sym}${item.key.toUpperCase()}`;
  }
  const prefix = mod === 'alt' ? 'Alt' : mod === 'altShift' ? 'Alt+Shift' : 'Ctrl+Alt';
  return `${prefix}+${item.key.toUpperCase()}`;
}
