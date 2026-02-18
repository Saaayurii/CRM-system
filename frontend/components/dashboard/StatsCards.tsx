'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Stats {
  projects: number | null;
  tasks: number | null;
  employees: number | null;
  teams: number | null;
}

const cards = [
  { key: 'projects' as const, label: 'Проекты', href: '/dashboard/projects', color: 'text-violet-500', bgHover: 'group-hover:ring-violet-500/20' },
  { key: 'tasks' as const, label: 'Задачи', href: '/dashboard/tasks', color: 'text-green-500', bgHover: 'group-hover:ring-green-500/20' },
  { key: 'employees' as const, label: 'Сотрудники', href: '/dashboard/employees', color: 'text-sky-500', bgHover: 'group-hover:ring-sky-500/20' },
  { key: 'teams' as const, label: 'Команды', href: '/dashboard/employees', color: 'text-amber-500', bgHover: 'group-hover:ring-amber-500/20' },
];

export default function StatsCards() {
  const [stats, setStats] = useState<Stats>({ projects: null, tasks: null, employees: null, teams: null });

  useEffect(() => {
    const fetch = async () => {
      const [p, t, u, tm] = await Promise.allSettled([
        api.get('/projects', { params: { limit: 1 } }),
        api.get('/tasks', { params: { limit: 1 } }),
        api.get('/users', { params: { limit: 1 } }),
        api.get('/teams', { params: { limit: 1 } }),
      ]);
      setStats({
        projects: p.status === 'fulfilled' ? (p.value.data.total ?? null) : null,
        tasks: t.status === 'fulfilled' ? (t.value.data.total ?? null) : null,
        employees: u.status === 'fulfilled' ? (u.value.data.total ?? null) : null,
        teams: tm.status === 'fulfilled' ? (tm.value.data.total ?? null) : null,
      });
    };
    fetch();
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Link key={c.key} href={c.href} className="group">
          <div className={`bg-white dark:bg-gray-800 shadow-xs rounded-xl p-4 transition-shadow group-hover:shadow-md group-hover:ring-1 ${c.bgHover}`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>
              {stats[c.key] !== null ? stats[c.key] : '—'}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
