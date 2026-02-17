'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Project {
  id: number;
  name: string;
  code?: string;
  status: number;
  priority: number;
  startDate?: string;
  plannedEndDate?: string;
  budget?: number;
  start_date?: string;
  planned_end_date?: string;
}

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Планирование', color: 'bg-gray-500/20 text-gray-600 dark:text-gray-300' },
  1: { label: 'Активный', color: 'bg-green-500/20 text-green-700 dark:text-green-400' },
  2: { label: 'Приостановлен', color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
  3: { label: 'Завершён', color: 'bg-sky-500/20 text-sky-700 dark:text-sky-400' },
  4: { label: 'Отменён', color: 'bg-red-500/20 text-red-700 dark:text-red-400' },
};

function formatDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU');
}

function formatBudget(b?: number): string {
  if (b == null) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(b);
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/projects');
        setProjects(data.projects || data.data || []);
      } catch {
        setError('Не удалось загрузить проекты');
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
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Проекты</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Список всех проектов</p>
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
        ) : projects.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Проекты не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                  <th className="py-3 px-4 text-left font-semibold">Название</th>
                  <th className="py-3 px-4 text-left font-semibold">Статус</th>
                  <th className="py-3 px-4 text-left font-semibold">Начало</th>
                  <th className="py-3 px-4 text-left font-semibold">Окончание</th>
                  <th className="py-3 px-4 text-right font-semibold">Бюджет</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {projects.map((p) => {
                  const status = STATUS_LABELS[p.status] || STATUS_LABELS[0];
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-gray-800 dark:text-gray-100">{p.name}</div>
                        {p.code && <div className="text-xs text-gray-400">{p.code}</div>}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400">{formatDate(p.startDate || p.start_date)}</td>
                      <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400">{formatDate(p.plannedEndDate || p.planned_end_date)}</td>
                      <td className="py-2.5 px-4 text-right text-gray-600 dark:text-gray-400">{formatBudget(p.budget)}</td>
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
