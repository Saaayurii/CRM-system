'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ColumnDef } from '@/types/admin';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { useT } from '@/lib/i18n';

type ViewMode = 'table' | 'grid';

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
  /** Если задан — клик по строке вызывает этот обработчик вместо onEdit. */
  onRowClick?: (row: T) => void;
  /** Callback для скачивания PDF всей таблицы */
  onDownloadPdf?: () => void;
  /** Идёт загрузка PDF */
  pdfLoading?: boolean;
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
  onRowClick,
  onDownloadPdf,
  pdfLoading,
}: DataTableProps<T>) {
  const t = useT();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('dataTableViewMode') as ViewMode) || 'table';
    }
    return 'table';
  });

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('dataTableViewMode', mode);
  };

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
      else if (sortKey === key && sortDir === 'desc') { setSortKey(null); setSortDir('asc'); onSort(key, 'asc'); return; }
      setSortKey(key);
      setSortDir(dir);
      onSort(key, dir);
    },
    [sortKey, sortDir, onSort]
  );

  if (loading) {
    return <TableSkeleton rows={limit} />;
  }

  const renderCellValue = (col: ColumnDef<T>, row: T) => {
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
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 flex items-center justify-end gap-0.5 px-4 sm:px-5 py-3 border-b border-gray-100 dark:border-gray-700/60">
        {/* Search icon */}
        <button
          onClick={() => setShowSearch((v) => !v)}
          title="Поиск"
          className={`p-2 rounded-lg transition-colors ${showSearch || searchQuery ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        {/* PDF icon */}
        {onDownloadPdf && (
          <button
            onClick={onDownloadPdf}
            disabled={pdfLoading}
            title={pdfLoading ? 'Формирование...' : 'Скачать PDF'}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        )}
        {/* Create icon */}
        {canCreate && onCreate && (
          <button
            onClick={onCreate}
            title="Создать"
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg ml-1">
          <button
            onClick={() => handleViewMode('table')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
            title="Таблица"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => handleViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
            title="Карточки"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>
      {/* Expandable search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 border-b border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-800">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Table view */}
      {viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="table-auto w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                {columns.map((col) => {
                  const isSortable = col.sortable !== false;
                  const isActive = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      className={`py-3 px-4 text-left font-semibold whitespace-nowrap ${isSortable ? 'cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 select-none' : ''}`}
                      style={col.width ? { width: col.width } : undefined}
                      onClick={isSortable ? () => handleSort(col.key) : undefined}
                    >
                      <div className="flex items-center gap-1">
                        {col.header}
                        {isSortable && (
                          <span className="inline-flex flex-col gap-px ml-0.5 align-middle shrink-0">
                            <svg className={`w-2 h-2 transition-colors ${isActive && sortDir === 'asc' ? 'text-violet-500' : 'text-gray-300 dark:text-gray-600'}`} viewBox="0 0 10 6" fill="currentColor">
                              <path d="M5 0L10 6H0L5 0Z" />
                            </svg>
                            <svg className={`w-2 h-2 transition-colors ${isActive && sortDir === 'desc' ? 'text-violet-500' : 'text-gray-300 dark:text-gray-600'}`} viewBox="0 0 10 6" fill="currentColor">
                              <path d="M5 6L0 0H10L5 6Z" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {(canEdit || canDelete || (customRowActions && customRowActions.length > 0)) && (
                  <th className="py-3 px-4 text-right font-semibold whitespace-nowrap w-px">{t('Действия')}</th>
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
                data.map((row, idx) => {
                  const rowHandler = onRowClick ?? onEdit;
                  return (
                  <tr key={(row.id as string | number) || idx} className={`hover:bg-gray-50 dark:hover:bg-gray-900/20 ${rowHandler ? 'cursor-pointer' : ''}`} onClick={rowHandler ? () => rowHandler(row) : undefined}>
                    {columns.map((col) => (
                      <td key={col.key} className="py-2.5 px-4 text-gray-800 dark:text-gray-100 max-w-[220px]">
                        <div className="truncate">{renderCellValue(col, row)}</div>
                      </td>
                    ))}
                    {(canEdit || canDelete || (customRowActions && customRowActions.length > 0)) && (
                      <td className="py-2.5 px-4 text-right whitespace-nowrap w-px" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1 items-center whitespace-nowrap">
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid / card view */
        <div className="p-4">
          {data.length === 0 ? (
            <p className="py-8 text-center text-gray-500 dark:text-gray-400">{t('Данные не найдены')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((row, idx) => {
                const [firstCol, ...restCols] = columns;
                return (
                  <div
                    key={(row.id as string | number) || idx}
                    className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
                  >
                    {/* Card title */}
                    <div
                      className={`font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight ${onEdit ? 'cursor-pointer hover:text-violet-600 dark:hover:text-violet-400' : ''}`}
                      onClick={() => onEdit?.(row)}
                    >
                      {renderCellValue(firstCol, row)}
                    </div>

                    {/* Rest of fields */}
                    {restCols.length > 0 && (
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                        {restCols.map((col) => (
                          <div key={col.key} className="min-w-0">
                            <dt className="text-xs text-gray-400 dark:text-gray-500 truncate">{col.header}</dt>
                            <dd className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 truncate">
                              {renderCellValue(col, row)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {/* Actions */}
                    {(canEdit || canDelete || (customRowActions && customRowActions.length > 0)) && (
                      <div className="flex items-center gap-1.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                        {customRowActions && customRowActions.map((action) => {
                          const isThisLoading = action.key === 'pdf' && loadingRowId === (row.id as number);
                          return (
                            <button
                              key={action.key}
                              onClick={() => onCustomAction?.(action.key, row)}
                              disabled={isThisLoading}
                              className="px-2.5 py-1 text-xs rounded bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50 transition-colors whitespace-nowrap disabled:opacity-50"
                              title={action.title ?? action.label}
                            >
                              {isThisLoading ? '...' : action.label}
                            </button>
                          );
                        })}
                        {canEdit && onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="flex-1 px-2.5 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded transition-colors text-center"
                          >
                            Изменить
                          </button>
                        )}
                        {canDelete && onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            className="px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
