'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { AxiosError } from 'axios';
import { categorizeError } from '@/lib/errors';
import { useToastStore } from '@/stores/toastStore';

interface UseCrudDataOptions {
  apiEndpoint: string;
  defaultLimit?: number;
}

interface CrudState<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  search: string;
  sortKey: string | null;
  sortDir: 'asc' | 'desc';
}

export function useCrudData<T extends Record<string, unknown>>({ apiEndpoint, defaultLimit = 20 }: UseCrudDataOptions) {
  const addToast = useToastStore((s) => s.addToast);
  const [state, setState] = useState<CrudState<T>>({
    data: [],
    total: 0,
    page: 1,
    limit: defaultLimit,
    loading: true,
    search: '',
    sortKey: null,
    sortDir: 'asc',
  });
  const [saving, setSaving] = useState(false);
  const errorShownRef = useRef(false);

  const fetchData = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const params: Record<string, string | number> = {
        page: state.page,
        limit: state.limit,
      };
      if (state.search) params.search = state.search;
      if (state.sortKey) {
        params.sortBy = state.sortKey;
        params.sortOrder = state.sortDir;
      }

      const { data: response } = await api.get(apiEndpoint, { params });
      errorShownRef.current = false;

      // Handle both paginated and flat array responses; guard against malformed data
      let items: T[] = [];
      let total = 0;

      if (response == null) {
        // null/undefined response
      } else if (Array.isArray(response)) {
        items = response as T[];
        total = response.length;
      } else if (typeof response === 'object') {
        const arr = response.data || response.items || response.results || [];
        items = Array.isArray(arr) ? (arr as T[]) : [];
        total = typeof response.total === 'number' ? response.total
          : typeof response.count === 'number' ? response.count
          : items.length;
      }

      setState((s) => ({ ...s, data: items, total, loading: false }));
    } catch (err) {
      // Only show toast once per error to prevent spam
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        const axiosErr = err as AxiosError;
        // Don't show toast if redirecting to login (401 handled by interceptor)
        if (axiosErr.response?.status !== 401) {
          const diagnostic = categorizeError(axiosErr, apiEndpoint);
          addToast('error', diagnostic.message);
        }
      }
      setState((s) => ({ ...s, data: [], total: 0, loading: false }));
    }
  }, [apiEndpoint, state.page, state.limit, state.search, state.sortKey, state.sortDir, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setPage = (page: number) => setState((s) => ({ ...s, page }));
  const setSearch = (search: string) => setState((s) => ({ ...s, search, page: 1 }));
  const setSort = (sortKey: string, sortDir: 'asc' | 'desc') => setState((s) => ({ ...s, sortKey, sortDir }));

  const createItem = async (data: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.post(apiEndpoint, data);
      addToast('success', 'Запись создана');
      await fetchData();
      return true;
    } catch (err) {
      const diagnostic = categorizeError(err as AxiosError, apiEndpoint);
      addToast('error', diagnostic.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (id: string | number, data: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.patch(`${apiEndpoint}/${id}`, data);
      addToast('success', 'Запись обновлена');
      await fetchData();
      return true;
    } catch (err) {
      const diagnostic = categorizeError(err as AxiosError, apiEndpoint);
      addToast('error', diagnostic.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string | number) => {
    setSaving(true);
    try {
      await api.delete(`${apiEndpoint}/${id}`);
      addToast('success', 'Запись удалена');
      await fetchData();
      return true;
    } catch (err) {
      const diagnostic = categorizeError(err as AxiosError, apiEndpoint);
      addToast('error', diagnostic.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    ...state,
    saving,
    setPage,
    setSearch,
    setSort,
    createItem,
    updateItem,
    deleteItem,
    refetch: fetchData,
  };
}
