'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Employee {
  id: number;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  isActive?: boolean;
  is_active?: boolean;
  role?: { name: string; code: string };
  roleId?: number;
  role_id?: number;
}

const ROLE_NAMES: Record<number, string> = {
  1: 'Супер Администратор',
  2: 'Администратор',
  3: 'HR Менеджер',
  4: 'Менеджер проектов',
  5: 'Прораб',
  6: 'Снабженец',
  7: 'Кладовщик',
  8: 'Бухгалтер',
  9: 'Инспектор',
  10: 'Рабочий',
  11: 'Поставщик',
  12: 'Подрядчик',
  13: 'Наблюдатель',
  14: 'Аналитик',
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/users');
        setEmployees(data.data || data || []);
      } catch {
        setError('Не удалось загрузить список сотрудников');
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
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Сотрудники</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Список всех сотрудников</p>
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
        ) : employees.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Сотрудники не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                  <th className="py-3 px-4 text-left font-semibold">Имя</th>
                  <th className="py-3 px-4 text-left font-semibold">Email</th>
                  <th className="py-3 px-4 text-left font-semibold">Роль</th>
                  <th className="py-3 px-4 text-left font-semibold">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {employees.map((e) => {
                  const active = e.isActive ?? e.is_active ?? true;
                  const roleName = e.role?.name || ROLE_NAMES[e.roleId || e.role_id || 0] || '—';
                  return (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-gray-800 dark:text-gray-100">{e.name || '—'}</div>
                        {e.position && <div className="text-xs text-gray-400">{e.position}</div>}
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400">{e.email}</td>
                      <td className="py-2.5 px-4 text-gray-600 dark:text-gray-400">{roleName}</td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          active
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                            : 'bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}>
                          {active ? 'Активен' : 'Неактивен'}
                        </span>
                      </td>
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
