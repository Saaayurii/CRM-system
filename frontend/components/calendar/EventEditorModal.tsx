'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { CustomEventType } from './types';

interface EventDraft {
  id?: number;
  title?: string;
  description?: string;
  eventType?: string;
  customTypeId?: number;
  startDatetime?: string;
  endDatetime?: string;
  isAllDay?: boolean;
  location?: string;
  recurrenceRule?: string;
  projectId?: number;
  taskId?: number;
  participants?: number[];
}

interface Props {
  initial: EventDraft | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

const SYSTEM_TYPES: { code: string; label: string; color: string }[] = [
  { code: 'meeting',    label: 'Совещание',  color: '#3b82f6' },
  { code: 'deadline',   label: 'Дедлайн',    color: '#ef4444' },
  { code: 'milestone',  label: 'Веха',       color: '#0ea5e9' },
  { code: 'inspection', label: 'Инспекция',  color: '#10b981' },
  { code: 'delivery',   label: 'Поставка',   color: '#f59e0b' },
  { code: 'training',   label: 'Обучение',   color: '#8b5cf6' },
  { code: 'payment',    label: 'Платёж',     color: '#22c55e' },
];

function toLocalInput(iso?: string, allDay = false): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  if (allDay) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const RECURRENCE_PRESETS: { rule?: string; label: string }[] = [
  { rule: undefined, label: 'Не повторять' },
  { rule: 'FREQ=DAILY', label: 'Каждый день' },
  { rule: 'FREQ=WEEKLY', label: 'Каждую неделю' },
  { rule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', label: 'По будням' },
  { rule: 'FREQ=MONTHLY', label: 'Каждый месяц' },
  { rule: 'FREQ=YEARLY', label: 'Каждый год' },
];

export default function EventEditorModal({ initial, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<EventDraft>(initial || {});
  const [customTypes, setCustomTypes] = useState<CustomEventType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<CustomEventType[]>('/calendar-custom-event-types')
      .then((r) => setCustomTypes(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCustomTypes([]));
  }, []);

  const update = (patch: Partial<EventDraft>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!form.title?.trim()) { setError('Укажите название'); return; }
    if (!form.startDatetime) { setError('Укажите дату начала'); return; }
    setError(null);
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        eventType: form.eventType,
        customTypeId: form.customTypeId || null,
        startDatetime: new Date(form.startDatetime).toISOString(),
        endDatetime: form.endDatetime ? new Date(form.endDatetime).toISOString() : undefined,
        isAllDay: form.isAllDay || false,
        location: form.location,
        recurrenceRule: form.recurrenceRule,
        projectId: form.projectId,
        taskId: form.taskId,
        participants: form.participants ?? [],
      };
      if (form.id) {
        await api.put(`/calendar-events/${form.id}`, payload);
      } else {
        await api.post('/calendar-events', payload);
      }
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id) return;
    if (!confirm('Удалить событие?')) return;
    setLoading(true);
    try {
      await api.delete(`/calendar-events/${form.id}`);
      onDeleted();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Не удалось удалить');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {form.id ? 'Редактировать событие' : 'Новое событие'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Название</label>
            <input
              type="text"
              value={form.title || ''}
              onChange={(e) => update({ title: e.target.value })}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              placeholder="Например: Совещание с заказчиком"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Начало</label>
              <input
                type={form.isAllDay ? 'date' : 'datetime-local'}
                value={toLocalInput(form.startDatetime, form.isAllDay)}
                onChange={(e) => update({ startDatetime: e.target.value })}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Окончание</label>
              <input
                type={form.isAllDay ? 'date' : 'datetime-local'}
                value={toLocalInput(form.endDatetime, form.isAllDay)}
                onChange={(e) => update({ endDatetime: e.target.value })}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input type="checkbox" checked={!!form.isAllDay} onChange={(e) => update({ isAllDay: e.target.checked })} />
            Весь день
          </label>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Тип события</label>
            <select
              value={form.customTypeId ? `custom:${form.customTypeId}` : form.eventType || ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v.startsWith('custom:')) {
                  update({ customTypeId: Number(v.slice(7)), eventType: 'custom' });
                } else {
                  update({ customTypeId: undefined, eventType: v });
                }
              }}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            >
              <option value="">— Без типа —</option>
              <optgroup label="Системные">
                {SYSTEM_TYPES.map((t) => (
                  <option key={t.code} value={t.code}>{t.label}</option>
                ))}
              </optgroup>
              {customTypes.length > 0 && (
                <optgroup label="Кастомные">
                  {customTypes.filter((c) => c.isActive).map((t) => (
                    <option key={t.id} value={`custom:${t.id}`}>{t.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Повторение</label>
            <select
              value={form.recurrenceRule || ''}
              onChange={(e) => update({ recurrenceRule: e.target.value || undefined })}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            >
              {RECURRENCE_PRESETS.map((p, i) => (
                <option key={i} value={p.rule || ''}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Место</label>
            <input
              type="text"
              value={form.location || ''}
              onChange={(e) => update({ location: e.target.value })}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Описание</label>
            <textarea
              rows={3}
              value={form.description || ''}
              onChange={(e) => update({ description: e.target.value })}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-600 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            {form.id && (
              <button
                onClick={handleDelete}
                className="text-sm text-red-600 hover:text-red-700"
                disabled={loading}
              >
                Удалить
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700">
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-md bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-60"
            >
              {loading ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
