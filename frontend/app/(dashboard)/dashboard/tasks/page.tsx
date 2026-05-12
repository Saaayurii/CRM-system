'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import TaskFormModal from '@/components/dashboard/TaskFormModal';
import { useOfflineData } from '@/hooks/useOfflineData';
import { useDownloadPdf } from '@/lib/hooks/useDownloadPdf';
import { useTaskNotifStore } from '@/stores/taskNotifStore';

interface Assignee {
  userId: number;
  userName?: string;
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: number;
  priority: number;
  dueDate?: string;
  due_date?: string;
  projectId?: number;
  project_id?: number;
  assignedToUserId?: number;
  assigned_to_user_id?: number;
  estimatedHours?: number;
  estimated_hours?: number;
  project?: { id: number; name: string };
  assignees?: Assignee[];
  assignedToUser?: { name: string; email: string };
  assigned_to_user?: { name: string; email: string };
}

interface Project {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  roleId?: number;
}

interface TasksPageData {
  tasks: Task[];
  projects: Project[];
  users: User[];
}

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Новая', color: 'bg-gray-500/20 text-gray-600 dark:text-gray-300' },
  1: { label: 'Назначена', color: 'bg-sky-500/20 text-sky-700 dark:text-sky-400' },
  2: { label: 'В работе', color: 'bg-violet-500/20 text-violet-700 dark:text-violet-400' },
  3: { label: 'На проверке', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  4: { label: 'Завершена', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  5: { label: 'Отменена', color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Низкий', color: 'text-gray-500' },
  2: { label: 'Средний', color: 'text-sky-500' },
  3: { label: 'Высокий', color: 'text-yellow-500' },
  4: { label: 'Критический', color: 'text-red-500' },
};

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU');
}

async function fetchTasksPageData(): Promise<TasksPageData> {
  const [tasksRes, projectsRes, usersRes] = await Promise.all([
    api.get('/tasks'),
    api.get('/projects', { params: { limit: 100 } }),
    api.get('/users', { params: { limit: 100 } }),
  ]);
  return {
    tasks: tasksRes.data.tasks || tasksRes.data.data || [],
    projects: projectsRes.data.projects || projectsRes.data.data || [],
    users: usersRes.data.data || usersRes.data.users || [],
  };
}

type ViewMode = 'table' | 'grid';

export default function TasksPage() {
  const addToast = useToastStore((s) => s.addToast);
  const { download: downloadPdf, loading: pdfLoading } = useDownloadPdf();
  const searchParams = useSearchParams();
  const markTasksRead = useTaskNotifStore((s) => s.markRead);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');

  useEffect(() => { markTasksRead(); }, []);

  const { data, loading, error, isFromCache, cachedAt, refetch } =
    useOfflineData<TasksPageData>(fetchTasksPageData, 'tasks-page');

  const tasks = data?.tasks ?? [];
  const projects = data?.projects ?? [];
  const users = data?.users ?? [];

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || !tasks.length) return;
    const task = tasks.find((t) => String(t.id) === editId);
    if (task) {
      setEditingTask(task);
      setShowModal(true);
    }
  }, [tasks, searchParams]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterStatus && String(t.status) !== filterStatus) return false;
      if (filterPriority && String(t.priority) !== filterPriority) return false;
      if (filterProject && String(t.projectId || t.project_id) !== filterProject) return false;
      const assignedId = t.assignedToUserId || t.assigned_to_user_id;
      if (filterAssignee && String(assignedId) !== filterAssignee) return false;
      return true;
    });
  }, [tasks, searchQuery, filterStatus, filterPriority, filterProject, filterAssignee]);

  const handleCreate = () => {
    setEditingTask(null);
    setShowModal(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить задачу?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/tasks/${id}`);
      addToast('success', 'Задача удалена');
      await refetch();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Ошибка при удалении');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = async () => {
    setShowModal(false);
    setEditingTask(null);
    await refetch();
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterProject('');
    setFilterAssignee('');
  };

  const hasActiveFilters =
    searchQuery || filterStatus || filterPriority || filterProject || filterAssignee;

  return (
    <div>
      <div className="sm:flex sm:justify-between sm:items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Задачи</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Управление задачами проекта</p>
        </div>
        <div className="flex items-center gap-3 mt-3 sm:mt-0">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
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
          <button
            onClick={() => downloadPdf('tasks', 'Задачи', filteredTasks.map((t) => ({
              Название: t.title,
              Статус: (STATUS_LABELS[t.status] || STATUS_LABELS[0]).label,
              Приоритет: (PRIORITY_LABELS[t.priority] || PRIORITY_LABELS[2]).label,
              Срок: t.dueDate ? new Date(t.dueDate).toLocaleDateString('ru-RU') : '—',
            })))}
            disabled={pdfLoading || filteredTasks.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {pdfLoading ? 'PDF...' : 'PDF'}
          </button>
          <Link href="/dashboard" className="text-sm text-violet-500 hover:text-violet-600">
            &larr; Назад
          </Link>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Создать задачу
          </button>
        </div>
      </div>

      {/* Offline / stale-data banner */}
      {isFromCache && (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
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

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">Все приоритеты</option>
            {Object.entries(PRIORITY_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">Все проекты</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">Все исполнители</option>
            {users.filter((u) => u.roleId !== 1).map((u) => (
              <option key={u.id} value={u.id}>{u.name || u.email}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="mt-3 text-sm text-violet-500 hover:text-violet-600 font-medium"
          >
            Сбросить фильтры
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">Загрузка...</div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-red-500">{error}</div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">
          {hasActiveFilters ? 'Задачи не найдены по заданным фильтрам' : 'Задачи не найдены'}
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                  <th className="py-3 px-4 text-left font-semibold">Название</th>
                  <th className="py-3 px-4 text-left font-semibold">Проект</th>
                  <th className="py-3 px-4 text-left font-semibold">Статус</th>
                  <th className="py-3 px-4 text-left font-semibold">Приоритет</th>
                  <th className="py-3 px-4 text-left font-semibold">Исполнитель</th>
                  <th className="py-3 px-4 text-left font-semibold">Срок</th>
                  <th className="py-3 px-4 text-center font-semibold">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filteredTasks.map((t) => {
                  const status = STATUS_LABELS[t.status] || STATUS_LABELS[0];
                  const priority = PRIORITY_LABELS[t.priority] || PRIORITY_LABELS[2];
                  const assignee = t.assignedToUser || t.assigned_to_user;
                  const assigneeId = t.assignedToUserId || t.assigned_to_user_id;
                  const resolvedUser = assigneeId ? users.find((u) => u.id === assigneeId) : null;
                  const resolveAssigneeName = (userId: number, userName: string | null) => {
                    if (userName) return userName;
                    const u = users.find((u) => u.id === userId);
                    return u?.name || u?.email || `#${userId}`;
                  };
                  const assigneeName =
                    t.assignees && t.assignees.length > 0
                      ? t.assignees.map((a) => resolveAssigneeName(a.userId, a.userName ?? null)).join(', ')
                      : assignee?.name || assignee?.email
                        || resolvedUser?.name || resolvedUser?.email
                        || '—';
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer"
                      onClick={() => handleEdit(t)}
                    >
                      <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-100">{t.title}</td>
                      <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400">{t.project?.name || '—'}</td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs font-medium ${priority.color}`}>{priority.label}</span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400">
                        {assigneeName}
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400">
                        {formatDate(t.dueDate || t.due_date)}
                      </td>
                      <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(t)}
                            className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors"
                            title="Редактировать"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={deletingId === t.id}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Удалить"
                          >
                            {deletingId === t.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
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
          {filteredTasks.map((t) => {
            const status = STATUS_LABELS[t.status] || STATUS_LABELS[0];
            const priority = PRIORITY_LABELS[t.priority] || PRIORITY_LABELS[2];
            const assignee = t.assignedToUser || t.assigned_to_user;
            const assigneeId = t.assignedToUserId || t.assigned_to_user_id;
            const resolvedUser = assigneeId ? users.find((u) => u.id === assigneeId) : null;
            const resolveAssigneeName = (userId: number, userName: string | null) => {
              if (userName) return userName;
              const u = users.find((u) => u.id === userId);
              return u?.name || u?.email || `#${userId}`;
            };
            const assigneeName =
              t.assignees && t.assignees.length > 0
                ? t.assignees.map((a) => resolveAssigneeName(a.userId, a.userName ?? null)).join(', ')
                : assignee?.name || assignee?.email
                  || resolvedUser?.name || resolvedUser?.email
                  || '—';
            return (
              <div key={t.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div
                  className="font-semibold text-gray-800 dark:text-gray-100 cursor-pointer hover:text-violet-600 dark:hover:text-violet-400"
                  onClick={() => handleEdit(t)}
                >
                  {t.title}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                  <span className={`text-xs font-medium ${priority.color}`}>{priority.label}</span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">Проект</dt>
                    <dd className="text-xs text-gray-700 dark:text-gray-300 truncate">{t.project?.name || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">Срок</dt>
                    <dd className="text-xs text-gray-700 dark:text-gray-300">{formatDate(t.dueDate || t.due_date)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-gray-400 dark:text-gray-500">Исполнитель</dt>
                    <dd className="text-xs text-gray-700 dark:text-gray-300 truncate">{assigneeName}</dd>
                  </div>
                </dl>
                <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => handleEdit(t)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded transition-colors text-center"
                  >
                    Изменить
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                  >
                    {deletingId === t.id ? '...' : 'Удалить'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <TaskFormModal
          task={editingTask}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
