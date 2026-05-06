'use client';

import { useState, useCallback, useRef } from 'react';

const PREFIX = 'crm_draft:';

function readStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const hasContent = Object.values(parsed).some(
      (v) => v !== '' && v !== null && v !== undefined && v !== 0 && v !== false,
    );
    return hasContent ? (parsed as T) : null;
  } catch {
    return null;
  }
}

export function useDraft<T extends Record<string, any>>(key: string, _fallback: T) {
  const storageKey = PREFIX + key;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read saved data synchronously once on mount
  const [savedData] = useState<T | null>(() => readStorage<T>(storageKey));
  const [hasDraft, setHasDraft] = useState(() => savedData !== null);

  // Debounced save — call this whenever form fields change
  const set = useCallback(
    (value: T) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(value));
        } catch {}
      }, 400);
    },
    [storageKey],
  );

  // Return saved data to the caller; hide the banner
  const restoreDraft = useCallback((): T | null => {
    setHasDraft(false);
    return savedData;
  }, [savedData]);

  // Remove from storage and hide banner
  const clearDraft = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setHasDraft(false);
  }, [storageKey]);

  return { hasDraft, set, restoreDraft, clearDraft };
}
