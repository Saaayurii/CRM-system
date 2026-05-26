'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

export interface ClientDTO {
  id?: number;
  clientType?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  companyName?: string;
  inn?: string;
  kpp?: string;
  legalAddress?: string;
  actualAddress?: string;
  email?: string;
  phone?: string;
  address?: string;
  signatoryName?: string;
  signatoryPosition?: string;
  status?: string;
  source?: string;
  notes?: string;
  assignedManagerId?: number;
}

interface Manager {
  id: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface Props {
  open: boolean;
  initial?: ClientDTO | null;
  onClose: () => void;
  onSaved: () => void;
}

const CLIENT_TYPES = [
  { value: 'individual', label: 'Физ. лицо', icon: '👤' },
  { value: 'company', label: 'Компания', icon: '🏢' },
  { value: 'government', label: 'Гос. орган', icon: '🏛' },
];

const STATUSES = [
  { value: 'active', label: 'Активен', color: 'green' },
  { value: 'inactive', label: 'Неактивен', color: 'gray' },
  { value: 'blocked', label: 'Заблокирован', color: 'red' },
];

export default function ClientFormModal({ open, initial, onClose, onSaved }: Props) {
  const addToast = useToastStore((s) => s.addToast);
  const [data, setData] = useState<ClientDTO>({ clientType: 'individual', status: 'active' });
  const [managers, setManagers] = useState<Manager[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setData(initial ? { ...initial } : { clientType: 'individual', status: 'active' });
    // Load managers list (project_manager + admin)
    api
      .get('/users', { params: { limit: 200 } })
      .then(({ data: resp }) => {
        const list: Manager[] =
          resp?.data || resp?.users || (Array.isArray(resp) ? resp : []) || [];
        setManagers(list);
      })
      .catch(() => setManagers([]));
  }, [open, initial]);

  if (!open) return null;

  const isCompany = data.clientType === 'company' || data.clientType === 'government';

  const handleField = <K extends keyof ClientDTO>(key: K, value: ClientDTO[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // strip empty strings and server-generated fields
      const SERVER_FIELDS = new Set(['id', 'accountId', 'createdAt', 'updatedAt', 'deletedAt']);
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v === '' || v === undefined || v === null) continue;
        if (SERVER_FIELDS.has(k)) continue;
        payload[k] = v;
      }
      if (initial?.id) {
        await api.put(`/clients/${initial.id}`, payload);
        addToast('success', 'Клиент обновлён');
      } else {
        await api.post('/clients', payload);
        addToast('success', 'Клиент создан');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      addToast('error', err?.response?.data?.message || 'Не удалось сохранить клиента');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {initial?.id ? 'Редактировать клиента' : 'Новый клиент'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Тип клиента — большие карточки */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Тип клиента
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CLIENT_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => handleField('clientType', t.value)}
                  className={`p-3 rounded-lg border-2 text-sm transition-all ${
                    data.clientType === t.value
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="text-2xl leading-none mb-1">{t.icon}</div>
                  <div className="font-medium">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional: physical vs legal */}
          {!isCompany ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Фамилия
                </label>
                <input
                  className="form-input w-full"
                  value={data.lastName ?? ''}
                  onChange={(e) => handleField('lastName', e.target.value)}
                  placeholder="Иванов"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Имя <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="form-input w-full"
                  value={data.firstName ?? ''}
                  onChange={(e) => handleField('firstName', e.target.value)}
                  placeholder="Иван"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Отчество
                </label>
                <input
                  className="form-input w-full"
                  value={data.middleName ?? ''}
                  onChange={(e) => handleField('middleName', e.target.value)}
                  placeholder="Иванович"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Название организации <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="form-input w-full"
                  value={data.companyName ?? ''}
                  onChange={(e) => handleField('companyName', e.target.value)}
                  placeholder='ООО "Строй-Инвест"'
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    ИНН
                  </label>
                  <input
                    className="form-input w-full"
                    value={data.inn ?? ''}
                    onChange={(e) => handleField('inn', e.target.value)}
                    placeholder="7701234567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    КПП
                  </label>
                  <input
                    className="form-input w-full"
                    value={data.kpp ?? ''}
                    onChange={(e) => handleField('kpp', e.target.value)}
                    placeholder="770101001"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Подписант (ФИО)
                  </label>
                  <input
                    className="form-input w-full"
                    value={data.signatoryName ?? ''}
                    onChange={(e) => handleField('signatoryName', e.target.value)}
                    placeholder="Иванов И. И."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Должность подписанта
                  </label>
                  <input
                    className="form-input w-full"
                    value={data.signatoryPosition ?? ''}
                    onChange={(e) => handleField('signatoryPosition', e.target.value)}
                    placeholder="Генеральный директор"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Контакты */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Email
              </label>
              <input
                type="email"
                className="form-input w-full"
                value={data.email ?? ''}
                onChange={(e) => handleField('email', e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Телефон
              </label>
              <input
                className="form-input w-full"
                value={data.phone ?? ''}
                onChange={(e) => handleField('phone', e.target.value)}
                placeholder="+7 (___) ___-__-__"
              />
            </div>
          </div>

          {/* Адрес */}
          {isCompany ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Юр. адрес
                </label>
                <textarea
                  rows={2}
                  className="form-textarea w-full"
                  value={data.legalAddress ?? ''}
                  onChange={(e) => handleField('legalAddress', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Факт. адрес
                </label>
                <textarea
                  rows={2}
                  className="form-textarea w-full"
                  value={data.actualAddress ?? ''}
                  onChange={(e) => handleField('actualAddress', e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Адрес
              </label>
              <textarea
                rows={2}
                className="form-textarea w-full"
                value={data.address ?? ''}
                onChange={(e) => handleField('address', e.target.value)}
              />
            </div>
          )}

          {/* Статус и менеджер */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Статус
              </label>
              <div className="flex gap-2">
                {STATUSES.map((s) => (
                  <button
                    type="button"
                    key={s.value}
                    onClick={() => handleField('status', s.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      data.status === s.value
                        ? `border-${s.color}-500 bg-${s.color}-50 dark:bg-${s.color}-500/10 text-${s.color}-700 dark:text-${s.color}-300`
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Ответственный менеджер
              </label>
              <select
                className="form-select w-full"
                value={data.assignedManagerId ?? ''}
                onChange={(e) =>
                  handleField('assignedManagerId', e.target.value ? Number(e.target.value) : undefined)
                }
              >
                <option value="">— не назначен —</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ||
                      [m.lastName, m.firstName].filter(Boolean).join(' ') ||
                      m.email ||
                      `#${m.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Заметки
            </label>
            <textarea
              rows={2}
              className="form-textarea w-full"
              value={data.notes ?? ''}
              onChange={(e) => handleField('notes', e.target.value)}
              placeholder="Дополнительная информация..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white text-sm font-medium"
            >
              {saving ? 'Сохранение...' : initial?.id ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
