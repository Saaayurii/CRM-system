'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const PREFIX = 'crm_draft:';

export function useDraft<T extends Record<string, any>>(key: string, initialValue: T) {
  const storageKey = PREFIX + key;
  const [hasDraft, setHasDraft] = useState(false);
  const [value, setValue] = useState<T>(initialValue);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: check if draft exists
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Only flag as draft if at least one meaningful field is non-empty
        const hasContent = Object.values(parsed).some((v) =>
          v !== '' && v !== null && v !== undefined && v !== 0 && v !== false
        );
        if (hasContent) setHasDraft(true);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save on every change
  const set = useCallback((updater: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      }, 400);
      return next;
    });
  }, [storageKey]);

  const restoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setValue(JSON.parse(raw));
        setHasDraft(false);
      }
    } catch {}
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch {}
    setHasDraft(false);
  }, [storageKey]);

  // Save immediately without debounce (call on submit/close)
  const flushClear = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    try { localStorage.removeItem(storageKey); } catch {}
    setHasDraft(false);
  }, [storageKey]);

  return { value, set, hasDraft, restoreDraft, clearDraft: flushClear };
}
