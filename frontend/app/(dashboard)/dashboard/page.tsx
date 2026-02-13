'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface DashboardCounts {
  projects: number | null;
  tasks: number | null;
  employees: number | null;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [counts, setCounts] = useState<DashboardCounts>({
    projects: null,
    tasks: null,
    employees: null,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [projectsRes, tasksRes, usersRes] = await Promise.allSettled([
          api.get('/projects', { params: { limit: 1 } }),
          api.get('/tasks', { params: { limit: 1 } }),
          api.get('/users', { params: { limit: 1 } }),
        ]);

        setCounts({
          projects: projectsRes.status === 'fulfilled' ? (projectsRes.value.data.total ?? projectsRes.value.data.data?.length ?? null) : null,
          tasks: tasksRes.status === 'fulfilled' ? (tasksRes.value.data.total ?? tasksRes.value.data.data?.length ?? null) : null,
          employees: usersRes.status === 'fulfilled' ? (usersRes.value.data.total ?? usersRes.value.data.data?.length ?? null) : null,
        });
      } catch {
        // Keep nulls as fallback
      }
    };

    fetchCounts();
  }, []);

  return (
    <div>
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
            Панель управления
          </h1>
          {user && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Добро пожаловать, {user.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/dashboard/projects" className="group">
          <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5 transition-shadow group-hover:shadow-md group-hover:ring-1 group-hover:ring-violet-500/20">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Проекты</h2>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-violet-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-violet-500">{counts.projects ?? '—'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {counts.projects !== null ? 'Всего проектов' : 'Загрузка...'}
            </p>
          </div>
        </Link>

        <Link href="/dashboard/tasks" className="group">
          <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5 transition-shadow group-hover:shadow-md group-hover:ring-1 group-hover:ring-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Задачи</h2>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-green-500">{counts.tasks ?? '—'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {counts.tasks !== null ? 'Всего задач' : 'Загрузка...'}
            </p>
          </div>
        </Link>

        <Link href="/dashboard/employees" className="group">
          <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5 transition-shadow group-hover:shadow-md group-hover:ring-1 group-hover:ring-sky-500/20">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Сотрудники</h2>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-sky-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-sky-500">{counts.employees ?? '—'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {counts.employees !== null ? 'Всего сотрудников' : 'Загрузка...'}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
