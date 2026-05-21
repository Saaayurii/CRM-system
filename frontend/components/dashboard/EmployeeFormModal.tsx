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
  mustChangePassword?: boolean;
  must_change_password?: boolean;
}

interface EmployeeFormModalProps {
  /** null → create mode, Employee → edit mode */
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
  { value: 11, label: 'Поставщик' },
  { value: 12, label: 'Подрядчик' },
  { value: 13, label: 'Наблюдатель' },
  { value: 14, label: 'Аналитик' },
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
  const isCreate = !employee;
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
    mustChangePassword: true, // default true for create mode
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
        mustChangePassword: employee.mustChangePassword ?? employee.must_change_password ?? false,
      });
    }
  }, [employee]);

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isCreate) {
        if (!form.roleId) {
          addToast('error', 'Выберите роль');
          setLoading(false);
          return;
        }
        if (!form.password || form.password.length < 6) {
          addToast('error', 'Пароль обязателен (минимум 6 символов)');
          setLoading(false);
          return;
        }
        const payload: Record<string, unknown> = {
          name: form.name,
          email: form.email,
          roleId: Number(form.roleId),
          phone: form.phone || undefined,
          position: form.position || undefined,
          password: form.password,
          mustChangePassword: form.mustChangePassword,
        };
        await api.post('/users', payload);
        addToast('success', 'Сотрудник создан');
      } else {
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
          mustChangePassword: form.mustChangePassword,
        };
        if (form.password) payload.newPassword = form.password;
        await api.put(`/users/${employee!.id}`, payload);
        addToast('success', 'Сотрудник обновлён');
      }
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
          {isCreate ? 'Создать сотрудника' : 'Редактировать сотрудника'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Основное */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Имя <span className="text-red-500">*</span></label>
              <input type="text" required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email <span className="text-red-500">*</span></label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Роль {isCreate && <span className="text-red-500">*</span>}
              </label>
              <select value={form.roleId} onChange={(e) => set('roleId', e.target.value)} className={inputCls} required={isCreate}>
                <option value="">{isCreate ? '— выберите роль —' : '— не изменять —'}</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            {!isCreate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Доступность</label>
                <select value={form.availability} onChange={(e) => set('availability', e.target.value)} className={inputCls}>
                  {AVAILABILITY_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Даты — только в edit */}
          {!isCreate && (
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
          )}

          {/* Адрес — только в edit */}
          {!isCreate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Адрес</label>
              <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} placeholder="г. Москва, ул. Примерная, 1" />
            </div>
          )}

          {/* Активность — только в edit */}
          {!isCreate && (
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
          )}

          {/* Пароль */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isCreate ? (
                <>Пароль <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(мин. 6 символов)</span></>
              ) : (
                <>Новый пароль <span className="text-gray-400 font-normal">(оставьте пустым, чтобы не менять)</span></>
              )}
            </label>
            <input
              type="password"
              required={isCreate}
              minLength={isCreate ? 6 : undefined}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              className={inputCls}
              autoComplete="new-password"
            />
          </div>

          {/* Force password change */}
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.mustChangePassword}
              onChange={(e) => set('mustChangePassword', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-500 focus:ring-violet-500 cursor-pointer"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Требовать смену пароля при первом входе
              <span className="block text-xs text-gray-400 dark:text-gray-500">
                Пользователь должен будет задать новый пароль сразу после входа
              </span>
            </span>
          </label>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Отмена
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {loading ? 'Сохранение...' : isCreate ? 'Создать' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
