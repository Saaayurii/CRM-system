'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import TaskFormModal from '@/components/dashboard/TaskFormModal';

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

export default function TasksPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterAssignee, setFilterAssignee] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/projects', { params: { limit: 100 } }),
        api.get('/users', { params: { limit: 100 } }),
      ]);
      setTasks(tasksRes.data.tasks || tasksRes.data.data || []);
      setProjects(projectsRes.data.projects || projectsRes.data.data || []);
      setUsers(usersRes.data.data || usersRes.data.users || []);
    } catch {
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      await fetchData();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Ошибка при удалении');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = async () => {
    setShowModal(false);
    setEditingTask(null);
    await fetchData();
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('');
    setFilterPriority('');
    setFilterProject('');
    setFilterAssignee('');
  };

  const hasActiveFilters = searchQuery || filterStatus || filterPriority || filterProject || filterAssignee;

  return (
    <div>
      <div className="sm:flex sm:justify-between sm:items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Задачи</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Управление задачами проекта</p>
        </div>
        <div className="flex items-center gap-3 mt-3 sm:mt-0">
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

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />

          {/* Status */}
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

          {/* Priority */}
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

          {/* Project */}
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

          {/* Assignee */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">Все исполнители</option>
            {users.map((u) => (
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

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Загрузка...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {hasActiveFilters ? 'Задачи не найдены по заданным фильтрам' : 'Задачи не найдены'}
          </div>
        ) : (
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
                        {t.assignees && t.assignees.length > 0
                          ? t.assignees.map((a) => a.userName || `#${a.userId}`).join(', ')
                          : assignee?.name || assignee?.email || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400">{formatDate(t.dueDate || t.due_date)}</td>
                      <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deletingId === t.id}
                          className="text-red-500 hover:text-red-600 disabled:opacity-50 text-xs font-medium"
                          title="Удалить"
                        >
                          {deletingId === t.id ? 'Удаление...' : 'Удалить'}
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
