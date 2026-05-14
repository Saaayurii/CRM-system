'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import EmployeeFormModal from '@/components/dashboard/EmployeeFormModal';
import { useDownloadPdf } from '@/lib/hooks/useDownloadPdf';

interface Employee {
  id: number;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  isActive?: boolean;
  is_active?: boolean;
  availability?: number;
  hireDate?: string;
  hire_date?: string;
  birthDate?: string;
  birth_date?: string;
  address?: string;
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

const AVAILABILITY_LABEL: Record<number, string> = {
  0: 'Офлайн', 1: 'Онлайн', 2: 'Занят', 3: 'В отпуске', 4: 'На больничном',
};

function fmtDate(v: string | null | undefined) {
  if (!v) return null;
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  } catch { return null; }
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const text = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0][0] || '?');
  return (
    <div className="w-16 h-16 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xl font-bold uppercase shrink-0">
      {text}
    </div>
  );
}

function EmployeeViewModal({
  employee,
  canEdit,
  onClose,
  onEdit,
}: {
  employee: Employee;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const active = employee.isActive ?? employee.is_active ?? true;
  const roleId = employee.roleId ?? employee.role_id;
  const roleName = employee.role?.name || ROLE_NAMES[roleId || 0] || '—';
  const availLabel = AVAILABILITY_LABEL[employee.availability ?? 1] ?? 'Онлайн';
  const hireDate = fmtDate(employee.hireDate || employee.hire_date);
  const birthDate = fmtDate(employee.birthDate || employee.birth_date);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <Initials name={employee.name || '?'} />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 leading-tight">
              {employee.name || '—'}
            </h2>
            {employee.position && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{employee.position}</p>
            )}
            <span className={`inline-flex mt-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              active
                ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                : 'bg-red-500/20 text-red-700 dark:text-red-400'
            }`}>
              {active ? 'Активен' : 'Неактивен'}
            </span>
          </div>
        </div>

        {/* Details */}
        <dl className="space-y-3">
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div>
              <dt className="text-xs text-gray-400">Роль</dt>
              <dd className="text-sm text-gray-800 dark:text-gray-100">{roleName}</dd>
            </div>
          </div>

          {employee.phone && (
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <div>
                <dt className="text-xs text-gray-400">Телефон</dt>
                <dd>
                  <a
                    href={`tel:${employee.phone}`}
                    className="text-sm text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    {employee.phone}
                  </a>
                </dd>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <dt className="text-xs text-gray-400">Email</dt>
              <dd className="text-sm text-gray-800 dark:text-gray-100 break-all">{employee.email}</dd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M9 10a3 3 0 106 0 3 3 0 00-6 0z" />
            </svg>
            <div>
              <dt className="text-xs text-gray-400">Доступность</dt>
              <dd className="text-sm text-gray-800 dark:text-gray-100">{availLabel}</dd>
            </div>
          </div>

          {hireDate && (
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <dt className="text-xs text-gray-400">Дата найма</dt>
                <dd className="text-sm text-gray-800 dark:text-gray-100">{hireDate}</dd>
              </div>
            </div>
          )}

          {birthDate && (
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18z" />
              </svg>
              <div>
                <dt className="text-xs text-gray-400">Дата рождения</dt>
                <dd className="text-sm text-gray-800 dark:text-gray-100">{birthDate}</dd>
              </div>
            </div>
          )}

          {employee.address && (
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <dt className="text-xs text-gray-400">Адрес</dt>
                <dd className="text-sm text-gray-800 dark:text-gray-100">{employee.address}</dd>
              </div>
            </div>
          )}
        </dl>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Закрыть
          </button>
          {canEdit && (
            <button
              onClick={onEdit}
              className="flex-1 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Редактировать
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type ViewMode = 'table' | 'grid';

export default function EmployeesPage() {
  const addToast = useToastStore((s) => s.addToast);
  const currentUser = useAuthStore((s) => s.user);
  const { download: downloadPdf, loading: pdfLoading } = useDownloadPdf();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('dashViewMode') as ViewMode) || 'table';
    }
    return 'table';
  });

  const canEdit = [1, 2].includes(currentUser?.roleId ?? 0);

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
          <button
            onClick={() => downloadPdf('employees', 'Сотрудники', employees.map((e) => ({
              Имя: e.name || '—',
              Email: e.email,
              Роль: e.role?.name || ROLE_NAMES[e.roleId || e.role_id || 0] || '—',
              Должность: e.position || '—',
              Статус: (e.isActive ?? e.is_active ?? true) ? 'Активен' : 'Неактивен',
            })))}
            disabled={pdfLoading || employees.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {pdfLoading ? 'PDF...' : 'PDF'}
          </button>
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
                  {canEdit && <th className="py-3 px-4 text-center font-semibold">Действия</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {employees.map((e) => {
                  const active = e.isActive ?? e.is_active ?? true;
                  const roleName = e.role?.name || ROLE_NAMES[e.roleId || e.role_id || 0] || '—';
                  return (
                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 cursor-pointer" onClick={() => setViewingEmployee(e)}>
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
                      {canEdit && (
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
                      )}
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
              <div
                key={e.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setViewingEmployee(e)}
              >
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
                  {e.phone && (
                    <div>
                      <dt className="text-xs text-gray-400 dark:text-gray-500">Телефон</dt>
                      <dd className="text-xs text-violet-600 dark:text-violet-400 truncate">{e.phone}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-gray-400 dark:text-gray-500">Роль</dt>
                    <dd className="text-xs text-gray-700 dark:text-gray-300">{roleName}</dd>
                  </div>
                </dl>
                {canEdit && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700" onClick={(ev) => ev.stopPropagation()}>
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
                )}
              </div>
            );
          })}
        </div>
      )}

      {viewingEmployee && (
        <EmployeeViewModal
          employee={viewingEmployee}
          canEdit={canEdit}
          onClose={() => setViewingEmployee(null)}
          onEdit={() => {
            setEditingEmployee(viewingEmployee);
            setViewingEmployee(null);
          }}
        />
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
