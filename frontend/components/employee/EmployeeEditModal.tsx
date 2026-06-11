'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { EmployeeAvatar, EmployeeData, ModalShell, OnlineBadge } from './shared';
import { useT } from '@/lib/i18n';

interface Props {
  employee: EmployeeData;
  onClose: () => void;
  onSaved: () => void;
}

const ROLE_OPTIONS = [
  { value: 2, label: 'Администратор' },
  { value: 3, label: 'HR Менеджер' },
  { value: 4, label: 'Менеджер проектов' },
  { value: 5, label: 'Прораб' },
  { value: 6, label: 'Снабженец' },
  { value: 7, label: 'Кладовщик' },
  { value: 8, label: 'Бухгалтер' },
  { value: 9, label: 'Инспектор' },
  { value: 10, label: 'Рабочий' },
  { value: 11, label: 'Поставщик' },
  { value: 12, label: 'Подрядчик' },
  { value: 13, label: 'Наблюдатель' },
  { value: 14, label: 'Аналитик' },
];

const inputCls =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent';

export default function EmployeeEditModal({ employee, onClose, onSaved }: Props) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    roleId: String(employee.roleId ?? employee.role_id ?? ''),
    position: employee.position || '',
    phone: employee.phone || '',
    email: employee.email || '',
    hireDate: (employee.hireDate || employee.hire_date || '').slice(0, 10),
    isActive: employee.isActive ?? employee.is_active ?? true,
  });

  useEffect(() => {
    setForm({
      roleId: String(employee.roleId ?? employee.role_id ?? ''),
      position: employee.position || '',
      phone: employee.phone || '',
      email: employee.email || '',
      hireDate: (employee.hireDate || employee.hire_date || '').slice(0, 10),
      isActive: employee.isActive ?? employee.is_active ?? true,
    });
  }, [employee]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        email: form.email,
        phone: form.phone || undefined,
        position: form.position || undefined,
        roleId: form.roleId ? Number(form.roleId) : undefined,
        hireDate: form.hireDate || undefined,
        isActive: form.isActive,
      };
      await api.put(`/users/${employee.id}`, payload);
      addToast('success', 'Сохранено');
      onSaved();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Редактировать сотрудника
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <EmployeeAvatar employee={employee} size="md" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
              {employee.name}
            </p>
            <div className="mt-0.5">
              <OnlineBadge employee={employee} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Роль
            </label>
            <select
              value={form.roleId}
              onChange={(e) => set('roleId', e.target.value)}
              className={inputCls}
            >
              <option value="">{t('— не изменять —')}</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Должность
            </label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => set('position', e.target.value)}
              className={inputCls}
              placeholder={t('Директор, PM…')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Телефон
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className={inputCls}
              placeholder="+7 999 123 45 67"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Дата найма
            </label>
            <input
              type="date"
              value={form.hireDate}
              onChange={(e) => set('hireDate', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button
            type="button"
            onClick={() => set('isActive', !form.isActive)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.isActive ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {form.isActive ? 'Активен' : 'Деактивирован'}
          </span>
        </div>

        <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
