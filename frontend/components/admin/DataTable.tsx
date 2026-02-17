'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ColumnDef } from '@/types/admin';
import { TableSkeleton } from '@/components/ui/Skeleton';

interface DataTableProps<T extends Record<string, unknown>> {
  columns: ColumnDef<T>[];
  data: T[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  searchPlaceholder?: string;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
  onSort: (key: string, direction: 'asc' | 'desc') => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onCreate?: () => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  customRowActions?: { key: string; label: string; title?: string }[];
  onCustomAction?: (actionKey: string, row: T) => void;
  loadingRowId?: number | null;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  total,
  page,
  limit,
  loading,
  searchPlaceholder = 'Поиск...',
  onPageChange,
  onSearch,
  onSort,
  onEdit,
  onDelete,
  onCreate,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  customRowActions,
  onCustomAction,
  loadingRowId,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSort = useCallback(
    (key: string) => {
      let dir: 'asc' | 'desc' = 'asc';
      if (sortKey === key && sortDir === 'asc') dir = 'desc';
      setSortKey(key);
      setSortDir(dir);
      onSort(key, dir);
    },
    [sortKey, sortDir, onSort]
  );

  if (loading) {
    return <TableSkeleton rows={limit} />;
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 dark:border-gray-700/60">
        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="form-input pl-9 w-full sm:w-64 text-sm"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {canCreate && onCreate && (
          <button onClick={onCreate} className="btn-sm bg-violet-500 hover:bg-violet-600 text-white">
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Создать
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table-auto w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 text-left font-semibold whitespace-nowrap ${
                    col.sortable ? 'cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 select-none' : ''
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <svg className={`w-3 h-3 ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 12 12">
                        <path d="M6 0l4 6H2z" />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
              {(canEdit || canDelete || (customRowActions && customRowActions.length > 0)) && (
                <th className="py-3 px-4 text-right font-semibold whitespace-nowrap w-32">Действия</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (canEdit || canDelete ? 1 : 0)} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Данные не найдены
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr key={(row.id as string | number) || idx} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                  {columns.map((col) => (
                    <td key={col.key} className="py-2.5 px-4 text-gray-800 dark:text-gray-100">
                      {(() => {
                        try {
                          if (col.render) return col.render(row[col.key], row);
                          const val = row[col.key];
                          if (val === null || val === undefined) return '—';
                          if (typeof val === 'boolean') return val ? 'Да' : 'Нет';
                          if (typeof val === 'object') return JSON.stringify(val);
                          return String(val);
                        } catch {
                          return '—';
                        }
                      })()}
                    </td>
                  ))}
                  {(canEdit || canDelete || (customRowActions && customRowActions.length > 0)) && (
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {customRowActions && customRowActions.map((action) => {
                          const isThisLoading = action.key === 'pdf' && loadingRowId === (row.id as number);
                          return (
                            <button
                              key={action.key}
                              onClick={() => onCustomAction?.(action.key, row)}
                              disabled={isThisLoading}
                              className="px-2 py-1 text-xs rounded bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50 transition-colors whitespace-nowrap disabled:opacity-50"
                              title={action.title ?? action.label}
                            >
                              {isThisLoading ? '...' : action.label}
                            </button>
                          );
                        })}
                        {canEdit && onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors"
                            title="Редактировать"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        {canDelete && onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="Удалить"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-gray-100 dark:border-gray-700/60">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Всего: {total}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="btn-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 disabled:opacity-40"
          >
            Назад
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Страница {page} из {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="btn-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 disabled:opacity-40"
          >
            Далее
          </button>
        </div>
      </div>
    </div>
  );
}
