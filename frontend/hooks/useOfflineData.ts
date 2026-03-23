'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getCached, setCached } from '@/lib/offlineCache';

interface UseOfflineDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string;
  /** True when currently showing cached (possibly stale) data */
  isFromCache: boolean;
  /** Timestamp (ms) when the cached snapshot was saved */
  cachedAt: number | null;
  refetch: () => Promise<void>;
}

/**
 * Offline-first data hook.
 *
 * Strategy:
 * 1. Show cached data immediately (no loading flash when cache hit).
 * 2. Fetch fresh data in background; update state + cache on success.
 * 3. If offline and no cache → show error.
 * 4. Re-fetches automatically when the browser comes back online.
 */
export function useOfflineData<T>(
  fetcher: () => Promise<T>,
  cacheKey: string,
): UseOfflineDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFromCache, setIsFromCache] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  // Keep a ref to the fetcher to avoid re-running effect on re-renders
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetch = useCallback(async (showLoadingIfNoCache = false) => {
    // 1. Load cache first (instant display)
    const cached = await getCached<T>(cacheKey);
    if (cached) {
      setData(cached.data);
      setCachedAt(cached.cachedAt);
      setIsFromCache(true);
      setLoading(false);
    } else if (showLoadingIfNoCache) {
      setLoading(true);
    }

    // 2. Try network
    if (!navigator.onLine && cached) {
      // Offline + have cache → done
      setLoading(false);
      return;
    }

    try {
      const fresh = await fetcherRef.current();
      setData(fresh);
      setIsFromCache(false);
      setCachedAt(null);
      setError('');
      await setCached(cacheKey, fresh);
    } catch {
      if (!cached) {
        setError('Не удалось загрузить данные');
      }
      // If cache was found above — stay silent, user already sees data
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  // Initial load
  useEffect(() => {
    fetch(true);
  }, [fetch]);

  // Auto-refetch when connectivity returns
  useEffect(() => {
    const handleOnline = () => fetch(false);
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetch]);

  return {
    data,
    loading,
    error,
    isFromCache,
    cachedAt,
    refetch: () => fetch(false),
  };
}
