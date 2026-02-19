'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface Task {
  id: number;
  title: string;
  status: number;
  priority?: number;
  dueDate?: string;
}

const priorityColors: Record<number, string> = {
  1: 'bg-red-500',    // critical
  2: 'bg-orange-500', // high
  3: 'bg-yellow-500', // medium
  4: 'bg-blue-500',   // low
  5: 'bg-gray-400',   // minimal
};

const statusLabels: Record<number, string> = {
  0: 'Новая',
  1: 'В работе',
  2: 'На проверке',
  3: 'Приостановлена',
  4: 'Выполнена',
  5: 'Отменена',
};

export default function TodoWidget() {
  const user = useAuthStore((s) => s.user);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchTasks = async () => {
      try {
        const { data } = await api.get('/tasks', {
          params: {
            assignedToUserId: user.id,
            limit: 10,
          },
        });
        const items = data.data || data.tasks || [];
        // Filter only active tasks (status 0,1,2,3)
        setTasks(items.filter((t: Task) => t.status < 4));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [user?.id]);

  const toggleDone = async (task: Task) => {
    const newStatus = task.status === 4 ? 1 : 4;
    try {
      await api.put(`/tasks/${task.id}`, { status: newStatus });
      setTasks((prev) =>
        newStatus === 4
          ? prev.filter((t) => t.id !== task.id)
          : prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)),
      );
    } catch {
      // silent
    }
  };

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Просрочено';
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Завтра';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Мои задачи</h3>
        <Link
          href="/dashboard/tasks"
          className="text-sm text-violet-500 hover:text-violet-600 font-medium transition-colors"
        >
          Все задачи →
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Загрузка...</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Нет активных задач</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => {
            const dueText = formatDueDate(task.dueDate);
            const isOverdue = dueText === 'Просрочено';
            return (
              <li key={task.id} className="flex items-start gap-3 group">
                <button
                  onClick={() => toggleDone(task)}
                  className="mt-0.5 w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-violet-500 dark:hover:border-violet-500 flex items-center justify-center transition-colors shrink-0"
                >
                  {task.status === 4 && (
                    <svg className="w-3 h-3 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${priorityColors[task.priority || 3]}`} />
                    <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{task.title}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{statusLabels[task.status] || ''}</span>
                    {dueText && (
                      <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400 dark:text-gray-500'}`}>
                        {dueText}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
