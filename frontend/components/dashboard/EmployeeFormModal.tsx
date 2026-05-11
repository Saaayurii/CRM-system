'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface Employee {
  id: number;
  name: string;
  email: string;
  phone?: string;
  roleId?: number;
  role_id?: number;
  position?: string;
  isActive?: boolean;
  is_active?: boolean;
  availability?: number;
  hireDate?: string;
  hire_date?: string;
  birthDate?: string;
  birth_date?: string;
  address?: string;
}

interface EmployeeFormModalProps {
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}

const ROLE_OPTIONS = [
  { value: 2,  label: 'Администратор' },
  { value: 3,  label: 'HR Менеджер' },
  { value: 4,  label: 'Менеджер проектов' },
  { value: 5,  label: 'Прораб' },
  { value: 6,  label: 'Снабженец' },
  { value: 7,  label: 'Кладовщик' },
  { value: 8,  label: 'Бухгалтер' },
  { value: 9,  label: 'Инспектор' },
  { value: 10, label: 'Рабочий' },
];

const AVAILABILITY_OPTIONS = [
  { value: 1, label: 'Онлайн' },
  { value: 2, label: 'Занят' },
  { value: 3, label: 'В отпуске' },
  { value: 4, label: 'На больничном' },
  { value: 0, label: 'Офлайн' },
];

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent';

export default function EmployeeFormModal({ employee, onClose, onSaved }: EmployeeFormModalProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    roleId: '',
    position: '',
    isActive: true,
    availability: '1',
    hireDate: '',
    birthDate: '',
    address: '',
    password: '',
  });

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        roleId: String(employee.roleId || employee.role_id || ''),
        position: employee.position || '',
        isActive: employee.isActive ?? employee.is_active ?? true,
        availability: String(employee.availability ?? 1),
        hireDate: employee.hireDate || employee.hire_date || '',
        birthDate: employee.birthDate || employee.birth_date || '',
        address: employee.address || '',
        password: '',
      });
    }
  }, [employee]);

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        roleId: form.roleId ? Number(form.roleId) : undefined,
        position: form.position || undefined,
        isActive: form.isActive,
        availability: Number(form.availability),
        hireDate: form.hireDate || undefined,
        birthDate: form.birthDate || undefined,
        address: form.address || undefined,
      };
      if (form.password) payload.newPassword = form.password;

      await api.put(`/users/${employee!.id}`, payload);
      addToast('success', 'Сотрудник обновлён');
      onSaved();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90dvh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-5">
          Редактировать сотрудника
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Основное */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Имя</label>
              <input type="text" required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Телефон</label>
              <input type="text" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Должность</label>
              <input type="text" value={form.position} onChange={(e) => set('position', e.target.value)} className={inputCls} placeholder="Директор, PM…" />
            </div>
          </div>

          {/* Роль и статусы */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Роль</label>
              <select value={form.roleId} onChange={(e) => set('roleId', e.target.value)} className={inputCls}>
                <option value="">— не изменять —</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Доступность</label>
              <select value={form.availability} onChange={(e) => set('availability', e.target.value)} className={inputCls}>
                {AVAILABILITY_OPTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Даты */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Дата найма</label>
              <input type="date" value={form.hireDate} onChange={(e) => set('hireDate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Дата рождения</label>
              <input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Адрес */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Адрес</label>
            <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} placeholder="г. Москва, ул. Примерная, 1" />
          </div>

          {/* Активность */}
          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              onClick={() => set('isActive', !form.isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {form.isActive ? 'Активен' : 'Деактивирован'}
            </span>
          </div>

          {/* Пароль */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Новый пароль <span className="text-gray-400 font-normal">(оставьте пустым, чтобы не менять)</span>
            </label>
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className={inputCls} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Отмена
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
