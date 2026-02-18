'use client';

import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import StatsCards from '@/components/dashboard/StatsCards';
import CalendarWidget from '@/components/dashboard/CalendarWidget';
import TodoWidget from '@/components/dashboard/TodoWidget';
import TeamWidget from '@/components/dashboard/TeamWidget';
import RecentProjectsWidget from '@/components/dashboard/RecentProjectsWidget';

interface DashboardCounts {
  projects: number | null;
  tasks: number | null;
  employees: number | null;
}

function SuperAdminDashboard({ user }: { user: any }) {
  const router = useRouter();
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

        <button
          onClick={() => router.push('/admin/settings')}
          className="group text-left"
        >
          <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5 transition-shadow group-hover:shadow-md group-hover:ring-1 group-hover:ring-violet-500/20">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Настройки</h2>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-violet-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Настройки приложения</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function AdminDashboard({ user }: { user: any }) {
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Доброе утро' : now.getHours() < 18 ? 'Добрый день' : 'Добрый вечер';
  const dateStr = now.toLocaleDateString('ru-RU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
          {greeting}, {user?.name || user?.email || 'Пользователь'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">{dateStr}</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6">
        <StatsCards />
      </div>

      {/* Main area: Calendar + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <CalendarWidget />
        </div>
        <div className="space-y-6">
          <TodoWidget />
          <TeamWidget />
        </div>
      </div>

      {/* Recent projects */}
      <RecentProjectsWidget />
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role?.code === 'super_admin';

  if (isSuperAdmin) {
    return <SuperAdminDashboard user={user} />;
  }

  return <AdminDashboard user={user} />;
}
