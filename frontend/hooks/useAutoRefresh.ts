'use client';

import { useEffect, useRef } from 'react';

/**
 * Periodically calls `refetch` and also on window focus / tab becoming visible.
 * Skips the poll tick if the document is hidden (user switched to another tab).
 */
export function useAutoRefresh(refetch: () => void, intervalMs = 30_000) {
  const fn = useRef(refetch);
  fn.current = refetch;

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') fn.current();
    };

    const onFocus = () => fn.current();
    const onVisible = () => {
      if (document.visibilityState === 'visible') fn.current();
    };

    const id = setInterval(tick, intervalMs);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
}
