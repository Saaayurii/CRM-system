'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import ProjectFormModal from '@/components/dashboard/ProjectFormModal';
import { useOfflineData } from '@/hooks/useOfflineData';
import { useDownloadPdf } from '@/lib/hooks/useDownloadPdf';
import { FAB_CREATED_EVENT } from '@/components/ui/QuickActionsButton';
import { useIsClient } from '@/hooks/useIsClient';
import { useT } from '@/lib/i18n';

interface Project {
  id: number;
  name: string;
  code?: string;
  description?: string;
  status: number;
  priority: number;
  startDate?: string;
  plannedEndDate?: string;
  budget?: number;
  start_date?: string;
  planned_end_date?: string;
  teamId?: number;
  team_id?: number;
}

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Планирование', color: 'bg-gray-500/20 text-gray-600 dark:text-gray-300' },
  1: { label: 'Активный', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  2: { label: 'Приостановлен', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  3: { label: 'Завершён', color: 'bg-sky-500/20 text-sky-700 dark:text-sky-400' },
  4: { label: 'Отменён', color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
};

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU');
}

function formatBudget(b?: number): string {
  if (b == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(b);
}

async function fetchProjects(): Promise<Project[]> {
  const { data } = await api.get('/projects');
  return data.projects || data.data || [];
}

type ViewMode = 'table' | 'grid';

export default function ProjectsPage() {
  const t = useT();
  const router = useRouter();
  const isClient = useIsClient();
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const { download: downloadPdf, loading: pdfLoading } = useDownloadPdf();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('dashViewMode') as ViewMode) || 'table';
    }
    return 'table';
  });

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('dashViewMode', mode);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: rawProjects, loading, error, isFromCache, cachedAt, refetch } =
    useOfflineData<Project[]>(fetchProjects, 'projects-page');

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.entity === 'project') refetch();
    };
    window.addEventListener(FAB_CREATED_EVENT, handler);
    return () => window.removeEventListener(FAB_CREATED_EVENT, handler);
  }, [refetch]);

  const projects = (rawProjects ?? []).filter((p) => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(p.code || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterStatus && String(p.status) !== filterStatus) return false;
    return true;
  });

  const hasActiveFilters = searchQuery || filterStatus;

  const handleRowClick = (project: Project) => {
    router.push(`/dashboard/projects/${project.id}`);
  };

  const handleCreate = () => {
    setEditProject(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditProject(null);
  };

  const handleSaved = () => {
    setShowModal(false);
    addToast('success', editProject ? 'Проект обновлён' : 'Проект создан');
    setEditProject(null);
    refetch();
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/projects/${confirmDelete.id}`);
      addToast('success', 'Проект удалён');
      setConfirmDelete(null);
      refetch();
    } catch {
      addToast('error', 'Не удалось удалить проект');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="sm:flex sm:justify-between sm:items-center mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">{t('Проекты')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('Список всех проектов')}</p>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => { setShowSearch((v) => !v); setShowFilter(false); }}
              title={t('Поиск')}
              className={`p-2 rounded-lg transition-colors ${showSearch || searchQuery ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {!isClient && (
              <button
                onClick={handleCreate}
                title={t('Создать проект')}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            <button
              onClick={() => { setShowFilter((v) => !v); setShowSearch(false); }}
              title={t('Фильтры')}
              className={`relative p-2 rounded-lg transition-colors ${showFilter || filterStatus ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              {filterStatus && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-violet-500" />}
            </button>
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings((v) => !v)}
                title={t('Экспорт')}
                className={`p-2 rounded-lg transition-colors ${showSettings ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {showSettings && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 z-50">
                  <button
                    onClick={() => { downloadPdf('projects', 'Проекты', (projects ?? []).map((p) => ({ Название: p.name, Код: p.code || '—', Статус: (STATUS_LABELS[p.status] || STATUS_LABELS[0]).label, Начало: p.startDate ? new Date(p.startDate).toLocaleDateString('ru-RU') : '—', Завершение: p.plannedEndDate ? new Date(p.plannedEndDate).toLocaleDateString('ru-RU') : '—', Бюджет: p.budget ? `${Number(p.budget).toLocaleString('ru-RU')} ₽` : '—' }))); setShowSettings(false); }}
                    disabled={pdfLoading || !projects?.length}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {pdfLoading ? 'PDF...' : 'Скачать PDF'}
                  </button>
                  {hasActiveFilters && (
                    <>
                      <div className="mx-3 my-1 border-t border-gray-100 dark:border-gray-700" />
                      <button
                        onClick={() => { setSearchQuery(''); setFilterStatus(''); setShowSettings(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Сбросить фильтры
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => handleViewMode('table')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title={t('Таблица')}
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => handleViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title={t('Карточки')}
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {showSearch && (
        <div className="mb-3 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl px-4 py-2.5 shadow-xs border border-gray-100 dark:border-gray-700">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            type="text"
            placeholder={t('Поиск по названию или коду...')}
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

      {showFilter && (
        <div className="mb-4 flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-xs border border-gray-100 dark:border-gray-700">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
          >
            <option value="">{t('Все статусы')}</option>
            {Object.entries(STATUS_LABELS).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          {filterStatus && (
            <button onClick={() => setFilterStatus('')} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              Сбросить
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">{t('Загрузка...')}</div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-red-500">{error}</div>
      ) : projects.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">
          {hasActiveFilters ? 'Проекты не найдены по заданным фильтрам' : 'Проекты не найдены'}
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                  <th className="py-3 px-4 text-left font-semibold">{t('Название')}</th>
                  <th className="py-3 px-4 text-left font-semibold">{t('Статус')}</th>
                  <th className="py-3 px-4 text-left font-semibold">{t('Начало')}</th>
                  <th className="py-3 px-4 text-left font-semibold">{t('Окончание')}</th>
                  <th className="py-3 px-4 text-right font-semibold">{t('Бюджет')}</th>
                  <th className="py-3 px-4 text-center font-semibold">{t('Действия')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {projects.map((p) => {
                  const status = STATUS_LABELS[p.status] || STATUS_LABELS[0];
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer"
                      onClick={() => handleRowClick(p)}
                    >
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-gray-800 dark:text-gray-100">{p.name}</div>
                        {p.code && <div className="text-xs text-gray-400">{p.code}</div>}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400">
                        {formatDate(p.startDate || p.start_date)}
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400">
                        {formatDate(p.plannedEndDate || p.planned_end_date)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-gray-600 dark:text-gray-400">
                        {formatBudget(p.budget)}
                      </td>
                      <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {!isClient && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => { setEditProject(p); setShowModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors"
                              title={t('Редактировать')}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setConfirmDelete(p)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                              title={t('Удалить')}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const status = STATUS_LABELS[p.status] || STATUS_LABELS[0];
            return (
              <div key={p.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div
                  className="font-semibold text-gray-800 dark:text-gray-100 cursor-pointer hover:text-violet-600 dark:hover:text-violet-400"
                  onClick={() => handleRowClick(p)}
                >
                  {p.name}
                  {p.code && <span className="ml-2 text-xs font-normal text-gray-400">{p.code}</span>}
                </div>
                <span className={`self-start inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                  {status.label}
                </span>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">{t('Начало')}</dt>
                    <dd className="text-xs text-gray-700 dark:text-gray-300">{formatDate(p.startDate || p.start_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">{t('Окончание')}</dt>
                    <dd className="text-xs text-gray-700 dark:text-gray-300">{formatDate(p.plannedEndDate || p.planned_end_date)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-gray-400 dark:text-gray-500">{t('Бюджет')}</dt>
                    <dd className="text-xs text-gray-700 dark:text-gray-300">{formatBudget(p.budget)}</dd>
                  </div>
                </dl>
                <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => handleRowClick(p)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded transition-colors text-center"
                  >
                    Открыть
                  </button>
                  {!isClient && (
                    <>
                      <button
                        onClick={() => { setEditProject(p); setShowModal(true); }}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded transition-colors text-center"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => setConfirmDelete(p)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                        title={t('Удалить')}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ProjectFormModal
          project={editProject}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setConfirmDelete(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('Удалить проект?')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Проект <span className="font-medium text-gray-700 dark:text-gray-300">{confirmDelete.name}</span> будет удалён без возможности восстановления.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {deleting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
