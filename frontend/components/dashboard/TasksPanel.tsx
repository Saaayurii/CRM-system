'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import TaskFormModal from '@/components/dashboard/TaskFormModal';

interface Task {
  id: number;
  title: string;
  status: number;
  priority: number;
  dueDate?: string;
  due_date?: string;
  assignees?: { id?: number; userId: number; userName?: string }[];
}

const TASK_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Новая',       color: 'bg-gray-500/20 text-gray-600 dark:text-gray-300' },
  1: { label: 'Назначена',   color: 'bg-sky-500/20 text-sky-700 dark:text-sky-400' },
  2: { label: 'В работе',    color: 'bg-violet-500/20 text-violet-700 dark:text-violet-400' },
  3: { label: 'На проверке', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  4: { label: 'Завершена',   color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  5: { label: 'Отменена',    color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
};

const TASK_PRIORITY: Record<number, { label: string; color: string }> = {
  1: { label: 'Низкий',      color: 'text-gray-500' },
  2: { label: 'Средний',     color: 'text-yellow-500' },
  3: { label: 'Высокий',     color: 'text-orange-500' },
  4: { label: 'Критический', color: 'text-red-500' },
};

function fmt(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU');
}

interface TasksPanelProps {
  projectId?: number;
  constructionSiteId?: number;
  title?: string;
}

export default function TasksPanel({ projectId, constructionSiteId, title = 'Задачи' }: TasksPanelProps) {
  const addToast = useToastStore((s) => s.addToast);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('');
  const [taskViewMode, setTaskViewMode] = useState<'table' | 'grid'>('table');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: 200 };
      if (constructionSiteId) params.constructionSiteId = constructionSiteId;
      else if (projectId) params.projectId = projectId;
      const r = await api.get('/tasks', { params });
      const arr = r.data?.tasks || r.data?.data || r.data || [];
      setTasks(Array.isArray(arr) ? arr : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, constructionSiteId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить задачу?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/tasks/${id}`);
      setTasks((p) => p.filter((t) => t.id !== id));
    } catch {
      addToast('error', 'Ошибка при удалении');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = tasks.filter((t) => {
    const matchSearch = !taskSearch || t.title.toLowerCase().includes(taskSearch.toLowerCase());
    const matchStatus = !taskStatusFilter || String(t.status ?? 0) === taskStatusFilter;
    const matchPriority = !taskPriorityFilter || String(t.priority ?? 2) === taskPriorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const defaultTaskValues = constructionSiteId
    ? { constructionSiteId, projectId }
    : projectId
    ? { projectId }
    : undefined;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 shrink-0">{title}</h2>
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Search */}
            <div className="relative flex-1 min-w-[120px] max-w-xs">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text" value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Поиск..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:outline-none"
              />
            </div>
            {/* Status filter */}
            <select value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value)}
              className="text-xs px-2 py-1.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500 focus:outline-none">
              <option value="">Все статусы</option>
              {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {/* Priority filter */}
            <select value={taskPriorityFilter} onChange={(e) => setTaskPriorityFilter(e.target.value)}
              className="text-xs px-2 py-1.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-violet-500 focus:outline-none">
              <option value="">Все приоритеты</option>
              {Object.entries(TASK_PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button onClick={() => setTaskViewMode('table')}
                className={`p-1.5 rounded transition-colors ${taskViewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`} title="Таблица">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 2h-4v3h4V4zm0 4h-4v3h4V8zm0 4h-4v3h3a1 1 0 0 0 1-1v-2zm-5 3v-3H6v3h4zm-5 0v-3H1v2a1 1 0 0 0 1 1h3zm-4-4h4V8H1v3zm0-4h4V4H1v3zm5-3v3h4V4H6zm4 4H6v3h4V8z" /></svg>
              </button>
              <button onClick={() => setTaskViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${taskViewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-violet-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`} title="Карточки">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z" /></svg>
              </button>
            </div>
            <span className="text-xs text-gray-400">{tasks.length} задач</span>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Создать задачу</span>
              <span className="sm:hidden">Создать</span>
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Задач нет</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Ничего не найдено</div>
        ) : taskViewMode === 'grid' ? (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((t) => {
              const ts = TASK_STATUS[t.status ?? 0] || TASK_STATUS[0];
              const tp = TASK_PRIORITY[t.priority ?? 2] || TASK_PRIORITY[2];
              return (
                <div key={t.id}
                  className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 cursor-pointer hover:ring-2 hover:ring-violet-300 dark:hover:ring-violet-600 transition-all"
                  onClick={() => setSelectedTask(t)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="font-medium text-gray-800 dark:text-gray-100 line-clamp-2 flex-1">{t.title}</div>
                    <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setSelectedTask(t)} className="p-1 text-gray-400 hover:text-violet-500 transition-colors rounded" title="Редактировать">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded disabled:opacity-40" title="Удалить">
                        {deletingId === t.id
                          ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        }
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ts.color}`}>{ts.label}</span>
                    <span className={`text-xs font-medium ${tp.color}`}>{tp.label}</span>
                  </div>
                  <div className="text-xs text-gray-400">{fmt(t.dueDate || t.due_date)}</div>
                  {(t.assignees?.length ?? 0) > 0 && (
                    <div className="mt-1 text-xs text-gray-400 truncate">
                      {t.assignees?.map((a) => a.userName || `#${a.userId}`).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                  <th className="py-3 px-4 text-left font-semibold">Название</th>
                  <th className="py-3 px-4 text-left font-semibold">Статус</th>
                  <th className="py-3 px-4 text-left font-semibold">Приоритет</th>
                  <th className="py-3 px-4 text-left font-semibold">Срок</th>
                  <th className="py-3 px-4 text-left font-semibold">Исполнители</th>
                  <th className="py-3 px-4 text-center font-semibold w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {filtered.map((t) => {
                  const ts = TASK_STATUS[t.status ?? 0] || TASK_STATUS[0];
                  const tp = TASK_PRIORITY[t.priority ?? 2] || TASK_PRIORITY[2];
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer" onClick={() => setSelectedTask(t)}>
                      <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-100">{t.title}</td>
                      <td className="py-2.5 px-4"><span className={`text-xs px-2 py-0.5 rounded-full ${ts.color}`}>{ts.label}</span></td>
                      <td className="py-2.5 px-4"><span className={`text-xs font-medium ${tp.color}`}>{tp.label}</span></td>
                      <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{fmt(t.dueDate || t.due_date)}</td>
                      <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400 text-xs">
                        {t.assignees?.map((a) => a.userName || `#${a.userId}`).join(', ') || '—'}
                      </td>
                      <td className="py-2.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => setSelectedTask(t)} className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors rounded" title="Редактировать">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded disabled:opacity-40" title="Удалить">
                            {deletingId === t.id
                              ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                              : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showCreate || selectedTask) && (
        <TaskFormModal
          task={showCreate ? defaultTaskValues : selectedTask}
          onClose={() => { setShowCreate(false); setSelectedTask(null); }}
          onSaved={() => { setShowCreate(false); setSelectedTask(null); load(); }}
        />
      )}
    </>
  );
}
