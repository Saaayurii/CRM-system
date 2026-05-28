'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import EmployeeFormModal from '@/components/dashboard/EmployeeFormModal';
import EmployeeQuickViewModal from '@/components/employee/EmployeeQuickViewModal';
import EmployeeEditModal from '@/components/employee/EmployeeEditModal';
import EmployeeFullProfileModal from '@/components/employee/EmployeeFullProfileModal';
import { useDownloadPdf } from '@/lib/hooks/useDownloadPdf';
import { FAB_CREATED_EVENT } from '@/components/ui/QuickActionsButton';

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
  avatarUrl?: string;
  avatar_url?: string;
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
  const currentUser = useAuthStore((s) => s.user);
  const { download: downloadPdf, loading: pdfLoading } = useDownloadPdf();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [fullProfileEmployee, setFullProfileEmployee] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editReturnTo, setEditReturnTo] = useState<'none' | 'quickview' | 'fullprofile'>('none');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('dashViewMode') as ViewMode) || 'table';
    }
    return 'table';
  });

  const canEdit = [1, 2].includes(currentUser?.roleId ?? 0);
  const canManageInvites = [1, 2, 3].includes(currentUser?.roleId ?? 0);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredEmployees = employees.filter((e) => {
    const roleId = e.roleId ?? e.role_id ?? 0;
    if (searchQuery && !((e.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || e.email.toLowerCase().includes(searchQuery.toLowerCase()))) return false;
    if (filterRole && String(roleId) !== filterRole) return false;
    return true;
  });

  const hasActiveFilters = searchQuery || filterRole;

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

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail?.entity === 'employee') fetchEmployees();
    };
    window.addEventListener(FAB_CREATED_EVENT, handler);
    return () => window.removeEventListener(FAB_CREATED_EVENT, handler);
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
      <div className="sm:flex sm:justify-between sm:items-center mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Сотрудники</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Список всех сотрудников</p>
        </div>
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => { setShowSearch((v) => !v); setShowFilter(false); }}
              title="Поиск"
              className={`p-2 rounded-lg transition-colors ${showSearch || searchQuery ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {canEdit && (
              <button
                onClick={() => setCreating(true)}
                title="Создать сотрудника"
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
            <button
              onClick={() => { setShowFilter((v) => !v); setShowSearch(false); }}
              title="Фильтры"
              className={`relative p-2 rounded-lg transition-colors ${showFilter || filterRole ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              {filterRole && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-violet-500" />}
            </button>
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings((v) => !v)}
                title="Экспорт и настройки"
                className={`p-2 rounded-lg transition-colors ${showSettings ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {showSettings && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1.5 z-50">
                  <button
                    onClick={() => { downloadPdf('employees', 'Сотрудники', employees.map((e) => ({ Имя: e.name || '—', Email: e.email, Роль: e.role?.name || ROLE_NAMES[e.roleId || e.role_id || 0] || '—', Должность: e.position || '—', Статус: (e.isActive ?? e.is_active ?? true) ? 'Активен' : 'Неактивен' }))); setShowSettings(false); }}
                    disabled={pdfLoading || employees.length === 0}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {pdfLoading ? 'PDF...' : 'Скачать PDF'}
                  </button>
                  {canManageInvites && (
                    <Link
                      href="/dashboard/employees/invites"
                      onClick={() => setShowSettings(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                      Заявки и инвайты
                    </Link>
                  )}
                  {hasActiveFilters && (
                    <>
                      <div className="mx-3 my-1 border-t border-gray-100 dark:border-gray-700" />
                      <button
                        onClick={() => { setSearchQuery(''); setFilterRole(''); setShowSettings(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Сбросить фильтры
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
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
        </div>
      </div>

      {showSearch && (
        <div className="mb-3 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl px-4 py-2.5 shadow-xs border border-gray-100 dark:border-gray-700">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            type="text"
            placeholder="Поиск по имени или email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {showFilter && (
        <div className="mb-4 flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-xs border border-gray-100 dark:border-gray-700">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
          >
            <option value="">Все роли</option>
            {Object.entries(ROLE_NAMES).filter(([k]) => k !== '1').map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          {filterRole && (
            <button onClick={() => setFilterRole('')} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              Сбросить
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">Загрузка...</div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-red-500">{error}</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">
          {hasActiveFilters ? 'Сотрудники не найдены по заданным фильтрам' : 'Сотрудники не найдены'}
        </div>
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
                {filteredEmployees.map((e) => {
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
          {filteredEmployees.map((e) => {
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
        <EmployeeQuickViewModal
          employee={viewingEmployee}
          canEdit={canEdit}
          onClose={() => setViewingEmployee(null)}
          onEdit={() => {
            setEditReturnTo('quickview');
            setEditingEmployee(viewingEmployee);
            setViewingEmployee(null);
          }}
          onOpenFullProfile={() => {
            setFullProfileEmployee(viewingEmployee);
            setViewingEmployee(null);
          }}
        />
      )}

      {fullProfileEmployee && (
        <EmployeeFullProfileModal
          employee={fullProfileEmployee}
          canEdit={canEdit}
          onClose={() => setFullProfileEmployee(null)}
          onEdit={() => {
            setEditReturnTo('fullprofile');
            setEditingEmployee(fullProfileEmployee);
            setFullProfileEmployee(null);
          }}
        />
      )}

      {editingEmployee && (
        <EmployeeEditModal
          employee={editingEmployee}
          onClose={() => {
            const emp = editingEmployee;
            const returnTo = editReturnTo;
            setEditingEmployee(null);
            setEditReturnTo('none');
            if (returnTo === 'quickview') setViewingEmployee(emp);
            else if (returnTo === 'fullprofile') setFullProfileEmployee(emp);
          }}
          onSaved={async () => {
            const emp = editingEmployee;
            const returnTo = editReturnTo;
            setEditingEmployee(null);
            setEditReturnTo('none');
            await fetchEmployees();
            if (returnTo === 'quickview') setViewingEmployee(emp);
            else if (returnTo === 'fullprofile') setFullProfileEmployee(emp);
          }}
        />
      )}

      {creating && (
        <EmployeeFormModal
          employee={null}
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await fetchEmployees();
          }}
        />
      )}
    </div>
  );
}
