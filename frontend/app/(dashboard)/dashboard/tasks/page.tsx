'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Assignee {
  userId: number;
  userName?: string;
}

interface Task {
  id: number;
  title: string;
  status: number;
  priority: number;
  dueDate?: string;
  due_date?: string;
  projectId?: number;
  project?: { id: number; name: string };
  assignees?: Assignee[];
  assignedToUser?: { name: string; email: string };
  assigned_to_user?: { name: string; email: string };
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/tasks');
        setTasks(data.tasks || data.data || []);
      } catch {
        setError('Не удалось загрузить задачи');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div>
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Задачи</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Список всех задач</p>
        </div>
        <Link href="/dashboard" className="text-sm text-violet-500 hover:text-violet-600 mt-2 sm:mt-0">
          &larr; Назад
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Загрузка...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Задачи не найдены</div>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {tasks.map((t) => {
                  const status = STATUS_LABELS[t.status] || STATUS_LABELS[0];
                  const priority = PRIORITY_LABELS[t.priority] || PRIORITY_LABELS[2];
                  const assignee = t.assignedToUser || t.assigned_to_user;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
