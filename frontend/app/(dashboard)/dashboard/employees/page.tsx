'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import EmployeeFormModal from '@/components/dashboard/EmployeeFormModal';

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

type ViewMode = 'table' | 'grid';

export default function EmployeesPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('dashViewMode') as ViewMode) || 'table';
    }
    return 'table';
  });

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('dashViewMode', mode);
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get('/users');
      const all: Employee[] = data.users || data.data || [];
      setEmployees(all.filter((e) => (e.roleId ?? e.role_id) !== 1));
    } catch {
      setError('Не удалось загрузить список сотрудников');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить сотрудника?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/users/${id}`);
      addToast('success', 'Сотрудник удалён');
      await fetchEmployees();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Ошибка при удалении');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Сотрудники</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Список всех сотрудников</p>
        </div>
        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => handleViewMode('table')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title="Таблица"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => handleViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
              title="Карточки"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
          <Link href="/dashboard" className="text-sm text-violet-500 hover:text-violet-600">
            &larr; Назад
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">Загрузка...</div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-red-500">{error}</div>
      ) : employees.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">Сотрудники не найдены</div>
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                  <th className="py-3 px-4 text-left font-semibold">Имя</th>
                  <th className="py-3 px-4 text-left font-semibold">Email</th>
                  <th className="py-3 px-4 text-left font-semibold">Роль</th>
                  <th className="py-3 px-4 text-left font-semibold">Статус</th>
                  <th className="py-3 px-4 text-center font-semibold">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {employees.map((e) => {
                  const active = e.isActive ?? e.is_active ?? true;
                  const roleName = e.role?.name || ROLE_NAMES[e.roleId || e.role_id || 0] || '—';
                  return (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer" onClick={() => setEditingEmployee(e)}>
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
                      <td className="py-2.5 px-4 text-center" onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingEmployee(e)}
                            className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors"
                            title="Редактировать"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            disabled={deletingId === e.id}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Удалить"
                          >
                            {deletingId === e.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((e) => {
            const active = e.isActive ?? e.is_active ?? true;
            const roleName = e.role?.name || ROLE_NAMES[e.roleId || e.role_id || 0] || '—';
            return (
              <div key={e.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{e.name || '—'}</p>
                    {e.position && <p className="text-xs text-gray-400 truncate">{e.position}</p>}
                  </div>
                  <span className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    active
                      ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                      : 'bg-red-500/20 text-red-700 dark:text-red-400'
                  }`}>
                    {active ? 'Активен' : 'Неактивен'}
                  </span>
                </div>
                <dl className="grid grid-cols-1 gap-1.5">
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">Email</dt>
                    <dd className="text-xs text-gray-700 dark:text-gray-300 truncate">{e.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">Роль</dt>
                    <dd className="text-xs text-gray-700 dark:text-gray-300">{roleName}</dd>
                  </div>
                </dl>
                <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => setEditingEmployee(e)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded transition-colors text-center"
                  >
                    Изменить
                  </button>
                  <button
                    onClick={() => handleDelete(e.id)}
                    disabled={deletingId === e.id}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                  >
                    {deletingId === e.id ? '...' : 'Удалить'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingEmployee && (
        <EmployeeFormModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSaved={async () => {
            setEditingEmployee(null);
            await fetchEmployees();
          }}
        />
      )}
    </div>
  );
}
