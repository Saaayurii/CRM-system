'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import ProjectFormModal from '@/components/dashboard/ProjectFormModal';
import { useOfflineData } from '@/hooks/useOfflineData';

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

export default function ProjectsPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const { data: projects, loading, error, isFromCache, cachedAt, refetch } =
    useOfflineData<Project[]>(fetchProjects, 'projects-page');

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

  return (
    <div>
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Проекты</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Список всех проектов</p>
        </div>
        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <Link href="/dashboard" className="text-sm text-violet-500 hover:text-violet-600">
            &larr; Назад
          </Link>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Создать проект
          </button>
        </div>
      </div>

      {/* Offline / stale-data banner */}
      {isFromCache && (
        <div className="flex items-center gap-3 px-4 py-3 mb-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <div className="flex-1 text-sm">
            <span className="font-semibold">Режим офлайн</span> — данные могут быть устаревшими
            {cachedAt && (
              <span className="ml-1 text-xs opacity-70">
                (кеш от {new Date(cachedAt).toLocaleString('ru-RU')})
              </span>
            )}
          </div>
          <button
            onClick={refetch}
            className="shrink-0 text-xs font-medium underline underline-offset-2 hover:no-underline"
          >
            Обновить
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Загрузка...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : !projects || projects.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Проекты не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                  <th className="py-3 px-4 text-left font-semibold">Название</th>
                  <th className="py-3 px-4 text-left font-semibold">Статус</th>
                  <th className="py-3 px-4 text-left font-semibold">Начало</th>
                  <th className="py-3 px-4 text-left font-semibold">Окончание</th>
                  <th className="py-3 px-4 text-right font-semibold">Бюджет</th>
                  <th className="py-3 px-4 text-center font-semibold">Действия</th>
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
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
                        >
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
                        <button
                          onClick={() => { setEditProject(p); setShowModal(true); }}
                          className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors"
                          title="Редактировать"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <ProjectFormModal
          project={editProject}
          onClose={handleModalClose}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
