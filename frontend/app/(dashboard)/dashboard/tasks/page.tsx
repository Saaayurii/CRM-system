'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import TaskFormModal from '@/components/dashboard/TaskFormModal';
import { useOfflineData } from '@/hooks/useOfflineData';
import { useTaskNotifStore } from '@/stores/taskNotifStore';
import { FAB_CREATED_EVENT } from '@/components/ui/QuickActionsButton';

interface Assignee {
  userId: number;
  userName?: string;
}

interface ChecklistItem {
  status?: number;
  checked?: boolean;
}

interface ChecklistGroup {
  id: string;
  items: ChecklistItem[];
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
  createdByUserId?: number;
  created_by_user_id?: number;
  createdAt?: string;
  created_at?: string;
  project?: { id: number; name: string };
  assignees?: Assignee[];
  assignedToUser?: { name: string; email: string };
  assigned_to_user?: { name: string; email: string };
  createdByUser?: { name: string; email: string };
  customFields?: { checklists?: ChecklistGroup[] };
  custom_fields?: { checklists?: ChecklistGroup[] };
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
  0: { label: 'Новая',       color: 'bg-gray-500/20 text-gray-600 dark:text-gray-300' },
  1: { label: 'Назначена',   color: 'bg-sky-500/20 text-sky-700 dark:text-sky-400' },
  2: { label: 'В работе',    color: 'bg-violet-500/20 text-violet-700 dark:text-violet-400' },
  3: { label: 'На проверке', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  4: { label: 'Завершена',   color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  5: { label: 'Отменена',    color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Низкий',      color: 'text-gray-500' },
  2: { label: 'Средний',     color: 'text-sky-500' },
  3: { label: 'Высокий',     color: 'text-yellow-500' },
  4: { label: 'Критический', color: 'text-red-500' },
};

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU');
}

function isTaskOverdue(t: Task): boolean {
  const due = t.dueDate || t.due_date;
  if (!due) return false;
  if (t.status === 4 || t.status === 5) return false;
  return new Date(due).getTime() < Date.now();
}

function getTaskProgress(t: Task): { done: number; total: number } {
  const cf = t.customFields || t.custom_fields;
  const lists: ChecklistGroup[] = cf?.checklists || [];
  let total = 0, done = 0;
  for (const g of lists) {
    for (const item of g.items || []) {
      total++;
      const st = typeof item.status === 'number' ? item.status : (item.checked ? 3 : 0);
      if (st === 3) done++;
    }
  }
  return { done, total };
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

type SortKey = 'title' | 'project' | 'status' | 'priority' | 'assignee' | 'creator' | 'dueDate';

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <span className="inline-flex flex-col gap-px ml-1 align-middle">
      <svg
        className={`w-2.5 h-2.5 transition-colors ${active && dir === 'asc' ? 'text-violet-500' : 'text-gray-300 dark:text-gray-600'}`}
        viewBox="0 0 10 6" fill="currentColor"
      >
        <path d="M5 0L10 6H0L5 0Z" />
      </svg>
      <svg
        className={`w-2.5 h-2.5 transition-colors ${active && dir === 'desc' ? 'text-violet-500' : 'text-gray-300 dark:text-gray-600'}`}
        viewBox="0 0 10 6" fill="currentColor"
      >
        <path d="M5 6L0 0H10L5 6Z" />
      </svg>
    </span>
  );
}

export default function TasksPage() {
  const addToast = useToastStore((s) => s.addToast);
  const searchParams = useSearchParams();
  const router = useRouter();
  const markTasksRead = useTaskNotifStore((s) => s.markRead);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [openedFromChat, setOpenedFromChat] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('dashViewMode') as 'table' | 'grid') || 'table';
    return 'table';
  });
  // Quick create: pre-fill project
  const [quickCreateProjectId, setQuickCreateProjectId] = useState<number | undefined>(undefined);

  useEffect(() => { markTasksRead(); }, []);

  const { data, loading, error, refetch } =
    useOfflineData<TasksPageData>(fetchTasksPageData, 'tasks-page');

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.entity === 'task') refetch();
    };
    window.addEventListener(FAB_CREATED_EVENT, handler);
    return () => window.removeEventListener(FAB_CREATED_EVENT, handler);
  }, [refetch]);

  const tasks = data?.tasks ?? [];
  const users = data?.users ?? [];

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || !tasks.length) return;
    const task = tasks.find((t) => String(t.id) === editId);
    if (task) {
      setEditingTask(task);
      setShowModal(true);
      try {
        if (typeof window !== 'undefined' && sessionStorage.getItem('taskBackTo')) {
          setOpenedFromChat(true);
        }
      } catch {}
    }
  }, [tasks, searchParams]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const resolveAssigneeName = (userId: number, userName: string | null) => {
    if (userName) return userName;
    const u = users.find((u) => u.id === userId);
    return u?.name || u?.email || `#${userId}`;
  };

  const sortedTasks = useMemo(() => {
    const base = [...tasks].sort((a, b) => {
      const aO = isTaskOverdue(a), bO = isTaskOverdue(b);
      if (aO !== bO) return aO ? -1 : 1;
      return new Date(b.createdAt || b.created_at || '').getTime() -
             new Date(a.createdAt || a.created_at || '').getTime();
    });
    if (!sortKey) return base;
    return base.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') cmp = a.title.localeCompare(b.title, 'ru');
      else if (sortKey === 'project') cmp = (a.project?.name || '').localeCompare(b.project?.name || '', 'ru');
      else if (sortKey === 'status') cmp = a.status - b.status;
      else if (sortKey === 'priority') cmp = a.priority - b.priority;
      else if (sortKey === 'dueDate') {
        const ad = a.dueDate || a.due_date || '';
        const bd = b.dueDate || b.due_date || '';
        cmp = ad < bd ? -1 : ad > bd ? 1 : 0;
      } else if (sortKey === 'assignee') {
        const aName = (a.assignees && a.assignees.length > 0)
          ? resolveAssigneeName(a.assignees[0].userId, a.assignees[0].userName ?? null)
          : (a.assignedToUser?.name || '');
        const bName = (b.assignees && b.assignees.length > 0)
          ? resolveAssigneeName(b.assignees[0].userId, b.assignees[0].userName ?? null)
          : (b.assignedToUser?.name || '');
        cmp = aName.localeCompare(bName, 'ru');
      } else if (sortKey === 'creator') {
        const aId = a.createdByUserId || a.created_by_user_id;
        const bId = b.createdByUserId || b.created_by_user_id;
        const aU = aId ? users.find((u) => u.id === aId) : null;
        const bU = bId ? users.find((u) => u.id === bId) : null;
        cmp = (aU?.name || '').localeCompare(bU?.name || '', 'ru');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tasks, sortKey, sortDir, users]);

  const handleCreate = (projectId?: number) => {
    setQuickCreateProjectId(projectId);
    setEditingTask(null);
    setShowModal(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setQuickCreateProjectId(undefined);
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
    setQuickCreateProjectId(undefined);
    await refetch();
  };

  const COLUMNS: { key: SortKey | null; label: string }[] = [
    { key: 'title',    label: 'Название' },
    { key: 'project',  label: 'Проект' },
    { key: 'status',   label: 'Статус' },
    { key: 'priority', label: 'Приоритет' },
    { key: 'assignee', label: 'Исполнитель' },
    { key: 'creator',  label: 'Поставил' },
    { key: 'dueDate',  label: 'Срок' },
    { key: null,       label: '' },
  ];

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Задачи</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Управление задачами проекта</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mt-3 sm:mt-0 w-fit">
          <button
            onClick={() => { setViewMode('table'); localStorage.setItem('dashViewMode', 'table'); }}
            className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
            title="Таблица"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => { setViewMode('grid'); localStorage.setItem('dashViewMode', 'grid'); }}
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
            title="Карточки"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">Загрузка...</div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-red-500">{error}</div>
      ) : sortedTasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">Задачи не найдены</div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTasks.map((t) => {
            const status = STATUS_LABELS[t.status] || STATUS_LABELS[0];
            const priority = PRIORITY_LABELS[t.priority] || PRIORITY_LABELS[2];
            const assignee = t.assignedToUser || t.assigned_to_user;
            const assigneeId = t.assignedToUserId || t.assigned_to_user_id;
            const resolvedUser = assigneeId ? users.find((u) => u.id === assigneeId) : null;
            const assigneeName =
              t.assignees && t.assignees.length > 0
                ? t.assignees.map((a) => resolveAssigneeName(a.userId, a.userName ?? null)).join(', ')
                : assignee?.name || assignee?.email || resolvedUser?.name || resolvedUser?.email || '—';
            const creatorId = t.createdByUserId || t.created_by_user_id;
            const creatorUser = creatorId ? users.find((u) => u.id === creatorId) : null;
            const creatorName = !creatorId || creatorUser?.roleId === 1 ? 'Система' : creatorUser?.name || creatorUser?.email || 'Система';
            const createdAt = t.createdAt || t.created_at;
            const overdue = isTaskOverdue(t);
            const { done, total } = getTaskProgress(t);
            const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={t.id} className={`border rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow ${overdue ? 'bg-red-50/70 dark:bg-red-900/10 border-red-300 dark:border-red-700/60' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                <div className="font-semibold text-gray-800 dark:text-gray-100 cursor-pointer hover:text-violet-600 dark:hover:text-violet-400" onClick={() => handleEdit(t)}>
                  {t.title}
                </div>
                {total > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${progressPct === 100 ? 'bg-green-500' : 'bg-violet-400'}`} style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400">{done}/{total}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
                  <span className={`text-xs font-medium ${priority.color}`}>{priority.label}</span>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                  <div><dt className="text-xs text-gray-400">Проект</dt><dd className="text-xs text-gray-700 dark:text-gray-300 truncate">{t.project?.name || '—'}</dd></div>
                  <div><dt className="text-xs text-gray-400">Срок</dt><dd className={`text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>{formatDate(t.dueDate || t.due_date)}</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-gray-400">Исполнитель</dt><dd className="text-xs text-gray-700 dark:text-gray-300 truncate">{assigneeName}</dd></div>
                  <div className="col-span-2"><dt className="text-xs text-gray-400">Поставил</dt><dd className="text-xs text-gray-700 dark:text-gray-300 truncate">{creatorName}{createdAt && <span className="ml-1 text-gray-400">{formatDate(createdAt)}</span>}</dd></div>
                </dl>
                <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button onClick={() => handleEdit(t)} className="flex-1 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded transition-colors text-center">Изменить</button>
                  <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors disabled:opacity-50">{deletingId === t.id ? '...' : 'Удалить'}</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700/60">
                  {COLUMNS.map((col) => (
                    <th key={col.label} className="py-3 px-4 text-left font-semibold">
                      {col.key ? (
                        <button
                          onClick={() => handleSort(col.key!)}
                          className="inline-flex items-center gap-0.5 hover:text-gray-600 dark:hover:text-gray-300 transition-colors select-none"
                        >
                          {col.label}
                          <SortIcon active={sortKey === col.key} dir={sortDir} />
                        </button>
                      ) : col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {sortedTasks.map((t) => {
                  const status = STATUS_LABELS[t.status] || STATUS_LABELS[0];
                  const priority = PRIORITY_LABELS[t.priority] || PRIORITY_LABELS[2];
                  const assignee = t.assignedToUser || t.assigned_to_user;
                  const assigneeId = t.assignedToUserId || t.assigned_to_user_id;
                  const resolvedUser = assigneeId ? users.find((u) => u.id === assigneeId) : null;
                  const assigneeName =
                    t.assignees && t.assignees.length > 0
                      ? t.assignees.map((a) => resolveAssigneeName(a.userId, a.userName ?? null)).join(', ')
                      : assignee?.name || assignee?.email || resolvedUser?.name || resolvedUser?.email || '—';
                  const creatorId = t.createdByUserId || t.created_by_user_id;
                  const creatorUser = creatorId ? users.find((u) => u.id === creatorId) : null;
                  const creatorName = !creatorId || creatorUser?.roleId === 1
                    ? 'Система'
                    : creatorUser?.name || creatorUser?.email || 'Система';
                  const createdAt = t.createdAt || t.created_at;
                  const overdue = isTaskOverdue(t);
                  const { done, total } = getTaskProgress(t);
                  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

                  return (
                    <tr
                      key={t.id}
                      className={`group/row relative hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer ${overdue ? 'bg-red-50/70 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20' : ''}`}
                      onClick={() => handleEdit(t)}
                    >
                      {/* Название */}
                      <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-100 max-w-[220px]">
                        <div className="truncate">{t.title}</div>
                        {/* Progress bar */}
                        {total > 0 && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${progressPct === 100 ? 'bg-green-500' : 'bg-violet-400'}`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 shrink-0">{done}/{total}</span>
                          </div>
                        )}
                      </td>
                      {/* Проект */}
                      <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {t.project?.name || '—'}
                      </td>
                      {/* Статус */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      {/* Приоритет */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`text-xs font-medium ${priority.color}`}>{priority.label}</span>
                      </td>
                      {/* Исполнитель */}
                      <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400 max-w-[160px]">
                        <div className="truncate">{assigneeName}</div>
                      </td>
                      {/* Поставил */}
                      <td className="py-2.5 px-4">
                        <span className="text-gray-700 dark:text-gray-300 text-sm">{creatorName}</span>
                        {createdAt && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {formatDate(createdAt)}
                          </div>
                        )}
                      </td>
                      {/* Срок */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}>
                          {formatDate(t.dueDate || t.due_date)}
                          {overdue && <span className="ml-1 text-[10px] uppercase tracking-wide">просрочена</span>}
                        </span>
                      </td>
                      {/* Действия: 4 иконки */}
                      <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          {/* Открыть */}
                          <button
                            onClick={() => handleEdit(t)}
                            title="Открыть задачу"
                            className="p-1.5 text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </button>
                          {/* Создать связанную */}
                          <button
                            onClick={() => handleCreate(t.projectId || t.project_id)}
                            title="Создать задачу в этом проекте"
                            className="p-1.5 text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                          {/* Редактировать */}
                          <button
                            onClick={() => handleEdit(t)}
                            title="Редактировать"
                            className="p-1.5 text-gray-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          {/* Удалить */}
                          <button
                            onClick={() => handleDelete(t.id)}
                            disabled={deletingId === t.id}
                            title="Удалить"
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deletingId === t.id ? (
                              <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin block" />
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
      )}

      {showModal && (
        <TaskFormModal
          task={editingTask}
          initialProjectId={!editingTask && quickCreateProjectId ? quickCreateProjectId : undefined}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
            setQuickCreateProjectId(undefined);
            if (openedFromChat) {
              try {
                const backTo = sessionStorage.getItem('taskBackTo');
                sessionStorage.removeItem('taskBackTo');
                setOpenedFromChat(false);
                if (backTo) { router.push(backTo); return; }
              } catch {}
            }
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
