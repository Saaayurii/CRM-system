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
      if (state.sortKey) {
        params.sortBy = state.sortKey;
        params.sortOrder = state.sortDir;
      }

      const { data: response } = await api.get(apiEndpoint, { params });
      errorShownRef.current = false;

      let items: T[] = [];
      let total = 0;

      if (response == null) {
        // null/undefined response
      } else if (Array.isArray(response)) {
        items = response as T[];
        total = response.length;
      } else if (typeof response === 'object') {
        const knownKeys = ['data', 'items', 'results'];
        let arr: unknown = knownKeys.map((k) => response[k]).find((v) => Array.isArray(v));
        if (!arr) {
          arr = Object.values(response as Record<string, unknown>).find((v) => Array.isArray(v));
        }
        items = Array.isArray(arr) ? (arr as T[]) : [];
        total = typeof response.total === 'number' ? response.total
          : typeof response.count === 'number' ? response.count
          : items.length;
      }

      setState((s) => ({ ...s, data: items, total, loading: false }));
    } catch (err) {
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        const axiosErr = err as AxiosError;
        if (axiosErr.response?.status !== 401) {
          const diagnostic = categorizeError(axiosErr, apiEndpoint);
          addToast('error', diagnostic.message);
        }
      }
      setState((s) => ({ ...s, data: [], total: 0, loading: false }));
    }
  }, [apiEndpoint, state.page, state.limit, state.sortKey, state.sortDir, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setPage = (page: number) => setState((s) => ({ ...s, page }));
  const setSearch = (search: string) => setState((s) => ({ ...s, search }));
  const setSort = (sortKey: string, sortDir: 'asc' | 'desc') => setState((s) => ({ ...s, sortKey, sortDir }));

  const createItem = async (data: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
    setSaving(true);
    try {
      const { data: created } = await api.post(apiEndpoint, data);
      addToast('success', 'Запись создана');
      setState((s) => ({
        ...s,
        data: [created as T, ...s.data],
        total: s.total + 1,
        page: 1,
      }));
      return created as Record<string, unknown>;
    } catch (err) {
      const diagnostic = categorizeError(err as AxiosError, apiEndpoint);
      addToast('error', diagnostic.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateItem = async (id: string | number, data: Record<string, unknown>) => {
    setSaving(true);
    try {
      const { data: updated } = await api.put(`${apiEndpoint}/${id}`, data);
      addToast('success', 'Запись обновлена');
      setState((s) => ({
        ...s,
        data: s.data.map((item) =>
          item.id === id ? { ...item, ...(updated as T) } : item
        ),
      }));
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
      setState((s) => ({
        ...s,
        data: s.data.filter((item) => item.id !== id),
        total: Math.max(0, s.total - 1),
      }));
      return true;
    } catch (err) {
      const diagnostic = categorizeError(err as AxiosError, apiEndpoint);
      addToast('error', diagnostic.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Client-side search filter applied on top of fetched data
  const searchLower = state.search.toLowerCase().trim();
  const displayData = searchLower
    ? state.data.filter((item) =>
        Object.values(item).some((val) => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'object') return JSON.stringify(val).toLowerCase().includes(searchLower);
          return String(val).toLowerCase().includes(searchLower);
        })
      )
    : state.data;

  return {
    ...state,
    data: displayData,
    total: searchLower ? displayData.length : state.total,
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
