'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Project {
  id: number;
  name: string;
  status?: string;
  budget?: number;
  progress?: number;
  updatedAt?: string;
}

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  on_hold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  completed: 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
};

const statusLabels: Record<string, string> = {
  planning: 'Планирование',
  active: 'Активный',
  on_hold: 'Приостановлен',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

export default function RecentProjectsWidget() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data } = await api.get('/projects', {
          params: { limit: 5, sortBy: 'updatedAt', sortOrder: 'desc' },
        });
        setProjects(data.data || data.projects || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const formatBudget = (b?: number) => {
    if (!b) return '—';
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(b);
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Последние проекты</h3>
        <Link href="/dashboard/projects" className="text-sm text-violet-500 hover:text-violet-600">
          Все
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Загрузка...</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Нет проектов</p>
      ) : (
        <ul className="space-y-3">
          {projects.map((project) => {
            const progress = project.progress ?? 0;
            const statusKey = project.status || 'planning';
            return (
              <li key={project.id} className="border border-gray-100 dark:border-gray-700/50 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <Link
                    href={`/dashboard/projects`}
                    className="text-sm font-medium text-gray-800 dark:text-gray-100 hover:text-violet-500 truncate"
                  >
                    {project.name}
                  </Link>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${statusColors[statusKey] || statusColors.planning}`}>
                    {statusLabels[statusKey] || statusKey}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-violet-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{progress}%</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Бюджет: {formatBudget(project.budget)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
