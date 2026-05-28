'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
  updatedAt?: string;
  updated_at?: string;
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

type SortKey = 'title' | 'project' | 'status' | 'priority' | 'assignee' | 'creator' | 'dueDate' | 'updatedAt';

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
  const [quickCreateProjectId, setQuickCreateProjectId] = useState<number | undefined>(undefined);
  const historyCache = useRef<Record<number, any[]>>({});
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [historyTooltip, setHistoryTooltip] = useState<{ taskId: number; x: number; y: number; events: any[] } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [filterProject, setFilterProject] = useState<number | null>(null);
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => { markTasksRead(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    if (showSettings) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

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
      } else if (sortKey === 'updatedAt') {
        const au = a.updatedAt || a.updated_at || '';
        const bu = b.updatedAt || b.updated_at || '';
        cmp = au < bu ? -1 : au > bu ? 1 : 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [tasks, sortKey, sortDir, users]);

  const filteredTasks = useMemo(() => {
    return sortedTasks.filter((t) => {
      if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterStatus !== null && t.status !== filterStatus) return false;
      if (filterProject !== null && (t.projectId || t.project_id) !== filterProject) return false;
      if (filterOverdue && !isTaskOverdue(t)) return false;
      return true;
    });
  }, [sortedTasks, searchQuery, filterStatus, filterProject, filterOverdue]);

  const hasActiveFilters = !!(searchQuery || filterStatus !== null || filterProject !== null || filterOverdue);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus(null);
    setFilterProject(null);
    setFilterOverdue(false);
    setShowSearch(false);
    setShowFilter(false);
  };

  const exportCSV = () => {
    const headers = ['Название', 'Проект', 'Статус', 'Приоритет', 'Исполнитель', 'Поставил', 'Срок', 'Изменён'];
    const rows = filteredTasks.map((t) => {
      const status = STATUS_LABELS[t.status]?.label || '';
      const priority = PRIORITY_LABELS[t.priority]?.label || '';
      const assigneeName =
        t.assignees?.length
          ? t.assignees.map((a) => resolveAssigneeName(a.userId, a.userName ?? null)).join('; ')
          : t.assignedToUser?.name || t.assigned_to_user?.name || '—';
      const creatorId = t.createdByUserId || t.created_by_user_id;
      const creatorUser = creatorId ? users.find((u) => u.id === creatorId) : null;
      const creatorName = !creatorId || creatorUser?.roleId === 1 ? 'Система' : (creatorUser?.name || '—');
      return [
        t.title, t.project?.name || '—', status, priority,
        assigneeName, creatorName,
        formatDate(t.dueDate || t.due_date),
        formatDate(t.updatedAt || t.updated_at),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `задачи_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchTaskComments = async (taskId: number) => {
    if (historyCache.current[taskId]) return historyCache.current[taskId];
    const res = await api.get('/task-comments', { params: { taskId, limit: 200 } });
    const raw: any[] = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.comments || []);
    const sorted = raw.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    historyCache.current[taskId] = sorted;
    return sorted;
  };

  const showTaskHistory = (e: React.MouseEvent, taskId: number) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    const rect = e.currentTarget.getBoundingClientRect();
    tooltipTimer.current = setTimeout(async () => {
      try {
        const events = await fetchTaskComments(taskId);
        setHistoryTooltip({ taskId, x: rect.left, y: rect.bottom, events: [...events].reverse().slice(0, 3) });
      } catch {}
    }, 250);
  };
  const hideTaskHistory = () => {
    tooltipTimer.current = setTimeout(() => setHistoryTooltip(null), 150);
  };
  const keepTaskHistory = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  };

  const openTaskHistory = async (task: Task) => {
    setHistoryTask(task);
    setHistoryEvents([]);
    setHistoryLoading(true);
    setHistoryTooltip(null);
    try {
      const events = await fetchTaskComments(task.id);
      setHistoryEvents(events);
    } catch {
      setHistoryEvents([]);
    } finally {
      setHistoryLoading(false);
    }
  };

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
    { key: 'title',     label: 'Название' },
    { key: 'project',   label: 'Проект' },
    { key: 'status',    label: 'Статус' },
    { key: 'priority',  label: 'Приоритет' },
    { key: 'assignee',  label: 'Исполнитель' },
    { key: 'creator',   label: 'Поставил' },
    { key: 'dueDate',   label: 'Срок' },
    { key: 'updatedAt', label: 'Изменён' },
  ];

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Задачи</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Управление задачами проекта</p>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          {/* Action buttons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowSearch((v) => !v)}
              title="Поиск"
              className={`relative p-2 rounded-lg transition-colors ${showSearch || searchQuery ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={() => handleCreate()}
              title="Создать задачу"
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={() => { setShowFilter((v) => !v); setShowSearch(false); }}
              title="Фильтры"
              className={`relative p-2 rounded-lg transition-colors ${showFilter || filterStatus !== null || filterProject !== null || filterOverdue ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              {(filterStatus !== null || filterProject !== null || filterOverdue) && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-violet-500" />
              )}
            </button>
            {/* Settings dropdown */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings((v) => !v)}
                title="Настройки и экспорт"
                className={`p-2 rounded-lg transition-colors ${showSettings ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {showSettings && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 z-50">
                  <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Экспорт</p>
                  <button
                    onClick={() => { window.print(); setShowSettings(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Скачать PDF
                  </button>
                  <button
                    onClick={() => { exportCSV(); setShowSettings(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Загрузить таблицу (CSV)
                  </button>
                  {hasActiveFilters && (
                    <>
                      <div className="mx-3 my-1 border-t border-gray-100 dark:border-gray-700" />
                      <button
                        onClick={() => { resetFilters(); setShowSettings(false); }}
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
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
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
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="mb-3 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl px-4 py-2.5 shadow-xs border border-gray-100 dark:border-gray-700">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            type="text"
            placeholder="Поиск по названию задачи..."
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

      {/* Filter tabs — visible when filter is toggled */}
      {showFilter && <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Status tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => { setFilterStatus(null); setFilterOverdue(false); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterStatus === null && !filterOverdue ? 'bg-violet-500 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'}`}
          >
            Все
          </button>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => { setFilterStatus(Number(k)); setFilterOverdue(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterStatus === Number(k) ? 'bg-violet-500 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'}`}
            >
              {v.label}
            </button>
          ))}
          <button
            onClick={() => { setFilterOverdue((v) => !v); setFilterStatus(null); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterOverdue ? 'bg-red-500 text-white shadow-sm' : 'bg-white dark:bg-gray-800 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-700/50 hover:border-red-400 dark:hover:border-red-500'}`}
          >
            Просроченные
          </button>
        </div>
        {/* Project filter */}
        <select
          value={filterProject ?? ''}
          onChange={(e) => setFilterProject(e.target.value === '' ? null : Number(e.target.value))}
          className={`text-xs font-medium rounded-lg px-3 py-1.5 outline-none transition-colors border ${filterProject !== null ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'} focus:border-violet-400`}
        >
          <option value="">Все проекты</option>
          {(data?.projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">Загрузка...</div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-red-500">{error}</div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">
          {hasActiveFilters ? 'Задачи не найдены — попробуйте изменить фильтры' : 'Задачи не найдены'}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((t) => {
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
              <div key={t.id} className={`group/card border rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow ${overdue ? 'bg-red-50/70 dark:bg-red-900/10 border-red-300 dark:border-red-700/60' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                <div className="flex items-start gap-1.5">
                  <div className="font-semibold text-gray-800 dark:text-gray-100 cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 flex-1 leading-snug" onClick={() => handleEdit(t)}>
                    {t.title}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(t); setHistoryTooltip(null); }}
                    onMouseEnter={(e) => showTaskHistory(e, t.id)}
                    onMouseLeave={hideTaskHistory}
                    className="shrink-0 opacity-0 group-hover/card:opacity-60 hover:!opacity-100 p-0.5 text-gray-400 hover:text-violet-500 transition-all mt-0.5"
                    title="История задачи"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
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
                {filteredTasks.flatMap((t) => {
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
                  const updatedAt = t.updatedAt || t.updated_at;
                  const overdue = isTaskOverdue(t);
                  const { done, total } = getTaskProgress(t);
                  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

                  const rows = [
                    <tr
                      key={t.id}
                      className={`group/row cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/20 ${overdue ? 'bg-red-50/70 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20' : ''}`}
                      onClick={() => handleEdit(t)}
                    >
                      {/* Название */}
                      <td className="pt-2.5 pb-1 px-4 font-medium text-gray-800 dark:text-gray-100 max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <div className="truncate flex-1">{t.title}</div>
                          <button
                            onClick={(e) => { e.stopPropagation(); openTaskHistory(t); }}
                            onMouseEnter={(e) => { e.stopPropagation(); showTaskHistory(e, t.id); }}
                            onMouseLeave={hideTaskHistory}
                            className="shrink-0 opacity-0 group-hover/row:opacity-60 hover:!opacity-100 p-0.5 text-gray-400 hover:text-violet-500 transition-all"
                            title="История задачи"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </div>
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
                      {/* Дата изменения */}
                      <td className="py-2.5 px-4 whitespace-nowrap text-gray-500 dark:text-gray-400 text-sm">
                        {formatDate(updatedAt)}
                      </td>
                    </tr>,
                  ];

                  if (total > 0) {
                    rows.push(
                      <tr key={`${t.id}-prog`} className={overdue ? 'bg-red-50/70 dark:bg-red-900/10' : ''}>
                        <td colSpan={8} className="px-0 pb-1.5 pt-0 border-0">
                          <div className="mx-4 flex items-center gap-2">
                            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${progressPct === 100 ? 'bg-green-500' : 'bg-violet-400'}`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400 shrink-0">{done}/{total}</span>
                          </div>
                        </td>
                      </tr>,
                    );
                  }

                  return rows;
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History tooltip (hover preview) */}
      {historyTooltip && (
        <div
          className="fixed z-[200] w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-4"
          style={{ top: historyTooltip.y + 8, left: Math.min(historyTooltip.x, (typeof window !== 'undefined' ? window.innerWidth : 1400) - 330) }}
          onMouseEnter={keepTaskHistory}
          onMouseLeave={hideTaskHistory}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Последние события</p>
          {historyTooltip.events.length === 0 ? (
            <p className="text-xs text-gray-400">Комментариев пока нет</p>
          ) : (
            <ul className="space-y-2.5">
              {historyTooltip.events.map((ev: any, i) => {
                const isSystem = ev.type === 'system' || (ev.commentText || ev.content || '').startsWith('__system__:');
                const text = (ev.commentText || ev.content || '').replace(/^__system__:/, '');
                const authorId = ev.userId || ev.user_id;
                const author = authorId ? users.find((u) => u.id === authorId) : null;
                const authorName = isSystem ? 'Система' : (author?.name || author?.email || 'Пользователь');
                return (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold ${isSystem ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'}`}>
                      {isSystem ? '⚙' : authorName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{authorName}</span>
                      <p className="text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{text}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">{new Date(ev.createdAt).toLocaleDateString('ru-RU')}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            onClick={() => { const t = tasks.find((t) => t.id === historyTooltip.taskId); if (t) openTaskHistory(t); setHistoryTooltip(null); }}
            className="text-xs text-violet-500 hover:text-violet-600 mt-3 block font-medium"
          >
            Смотреть всю историю →
          </button>
        </div>
      )}

      {/* Full history drawer */}
      {historyTask && (
        <div className="fixed inset-0 z-[150] flex" onClick={() => setHistoryTask(null)}>
          <div className="flex-1" />
          <div
            className="w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">История задачи</p>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{historyTask.title}</h2>
                  {historyTask.project?.name && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{historyTask.project.name}</p>
                  )}
                </div>
                <button
                  onClick={() => setHistoryTask(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                <span>Статус: <span className="font-medium text-gray-700 dark:text-gray-300">{STATUS_LABELS[historyTask.status]?.label || '—'}</span></span>
                <span>Приоритет: <span className="font-medium text-gray-700 dark:text-gray-300">{PRIORITY_LABELS[historyTask.priority]?.label || '—'}</span></span>
                {(historyTask.dueDate || historyTask.due_date) && (
                  <span>Срок: <span className="font-medium text-gray-700 dark:text-gray-300">{formatDate(historyTask.dueDate || historyTask.due_date)}</span></span>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {historyLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mr-2" />
                  Загрузка истории...
                </div>
              ) : historyEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">История пуста</p>
                  <p className="text-xs mt-1 text-gray-300 dark:text-gray-600">Комментарии появятся после первых действий</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-4 top-4 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-0">
                    {historyEvents.map((ev: any, i) => {
                      const isSystem = ev.type === 'system' || (ev.commentText || ev.content || '').startsWith('__system__:');
                      const rawText = ev.commentText || ev.content || '';
                      const text = rawText.replace(/^__system__:/, '');
                      const authorId = ev.userId || ev.user_id;
                      const author = authorId ? users.find((u) => u.id === authorId) : null;
                      const authorName = isSystem ? 'Система' : (author?.name || author?.email || `#${authorId}`);
                      const dt = new Date(ev.createdAt);
                      const prevDt = i > 0 ? new Date(historyEvents[i - 1].createdAt) : null;
                      const showDate = !prevDt || dt.toDateString() !== prevDt.toDateString();

                      const iconBg = isSystem
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                        : 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400';

                      return (
                        <div key={ev.id || i}>
                          {showDate && (
                            <div className="flex items-center gap-3 my-4 pl-10">
                              <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                {dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                          <div className="flex gap-4 py-3 relative">
                            {/* Icon */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold z-10 ${iconBg}`}>
                              {isSystem
                                ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                : authorName.slice(0, 2).toUpperCase()
                              }
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-baseline justify-between gap-2 mb-1">
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{authorName}</span>
                                <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
                                  {dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className={`text-sm leading-relaxed break-words ${isSystem ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg' : 'text-gray-700 dark:text-gray-300'}`}>
                                {text}
                              </p>
                              {/* Attachments in comments */}
                              {ev.attachments && (() => {
                                let atts: any[] = [];
                                try { atts = Array.isArray(ev.attachments) ? ev.attachments : JSON.parse(ev.attachments); } catch {}
                                return atts.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {atts.map((a: any, ai: number) => (
                                      <a key={ai} href={a.fileUrl || a.file_url} target="_blank" rel="noopener noreferrer"
                                        className="text-xs text-violet-500 hover:underline bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded"
                                      >
                                        {a.fileName || a.file_name || 'файл'}
                                      </a>
                                    ))}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0 flex items-center justify-between">
              <span className="text-xs text-gray-400">{historyEvents.length} событий</span>
              <button
                onClick={() => { setHistoryTask(null); handleEdit(historyTask); }}
                className="px-4 py-1.5 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors"
              >
                Открыть задачу
              </button>
            </div>
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
