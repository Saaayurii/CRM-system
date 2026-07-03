'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';

/* ─── Reference data ─── */

// Entity types as labelled by the audit producer (api-gateway AuditInterceptor).
const ENTITIES: { value: string; label: string }[] = [
  { value: '*', label: 'Любая сущность' },
  { value: 'task', label: 'Задача' },
  { value: 'project', label: 'Проект' },
  { value: 'construction_site', label: 'Объект' },
  { value: 'client', label: 'Клиент' },
  { value: 'inspection', label: 'Инспекция' },
  { value: 'defect', label: 'Дефект' },
  { value: 'document', label: 'Документ' },
  { value: 'payment', label: 'Платёж' },
  { value: 'budget', label: 'Бюджет' },
  { value: 'material', label: 'Материал' },
  { value: 'supplier', label: 'Поставщик' },
  { value: 'equipment', label: 'Оборудование' },
  { value: 'employee', label: 'Сотрудник' },
  { value: 'user', label: 'Пользователь' },
  { value: 'calendar_event', label: 'Событие календаря' },
  { value: 'registration', label: 'Заявка на регистрацию' },
];

const ACTIONS: { value: string; label: string }[] = [
  { value: '*', label: 'Любое действие' },
  { value: 'create', label: 'Создание' },
  { value: 'update', label: 'Изменение' },
  { value: 'delete', label: 'Удаление' },
  { value: 'approve', label: 'Одобрение' },
  { value: 'reject', label: 'Отклонение' },
];

const ROLES: { id: number; name: string }[] = [
  { id: 1, name: 'Супер-админ' },
  { id: 2, name: 'Администратор' },
  { id: 3, name: 'HR' },
  { id: 4, name: 'Менеджер проектов' },
  { id: 5, name: 'Прораб' },
  { id: 6, name: 'Снабженец' },
  { id: 7, name: 'Кладовщик' },
  { id: 8, name: 'Бухгалтер' },
  { id: 9, name: 'Инспектор' },
  { id: 10, name: 'Рабочий' },
];

/* ─── Types ─── */

interface RuleAction {
  type: 'notify' | 'webhook';
  roleIds?: number[];
  excludeActor?: boolean;
  title?: string;
  message?: string;
  url?: string;
}

interface AutomationRule {
  id: number;
  name: string;
  description?: string;
  triggerEvent?: string;
  actions?: RuleAction[];
  isActive: boolean;
  executionCount?: number;
  lastExecutedAt?: string;
}

const labelFor = (list: { value: string; label: string }[], v: string) =>
  list.find((x) => x.value === v)?.label ?? v;

function triggerLabel(triggerEvent?: string): string {
  if (!triggerEvent) return '—';
  const [entity, action] = triggerEvent.split('.');
  return `${labelFor(ENTITIES, entity || '*')} · ${labelFor(ACTIONS, action || '*')}`;
}

/* ─── Empty form state ─── */

function emptyAction(type: RuleAction['type'] = 'notify'): RuleAction {
  return type === 'notify'
    ? { type: 'notify', roleIds: [2], excludeActor: true, title: '', message: '' }
    : { type: 'webhook', url: '' };
}

export default function AutomationPage() {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const { data } = await api.get('/automation-rules', { params: { limit: 100 } });
      const arr: AutomationRule[] = data?.data || data?.items || (Array.isArray(data) ? data : []);
      setRules(arr);
    } catch {
      addToast('error', 'Не удалось загрузить правила');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (rule: AutomationRule) => {
    setEditing(rule);
    setShowForm(true);
  };

  const toggleActive = async (rule: AutomationRule) => {
    try {
      await api.put(`/automation-rules/${rule.id}`, { isActive: !rule.isActive });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r)));
    } catch {
      addToast('error', 'Не удалось изменить статус');
    }
  };

  const remove = async (rule: AutomationRule) => {
    if (!confirm(`Удалить правило «${rule.name}»?`)) return;
    try {
      await api.delete(`/automation-rules/${rule.id}`);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      addToast('success', 'Правило удалено');
    } catch {
      addToast('error', 'Не удалось удалить правило');
    }
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="sm:flex sm:justify-between sm:items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{t('Автоматизация')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('Правила «событие → действие». При действии в системе срабатывает уведомление или вебхук.')}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="mt-3 sm:mt-0 inline-flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t('Создать правило')}
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">{t('Загрузка...')}</div>
      ) : rules.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">
          {t('Правил пока нет. Создайте первое — например, «уведомить админов при удалении проекта».')}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-800 dark:text-gray-100 truncate">{rule.name}</div>
                  {rule.description && <div className="text-xs text-gray-400 truncate">{rule.description}</div>}
                </div>
                <button
                  onClick={() => toggleActive(rule)}
                  title={rule.isActive ? t('Активно') : t('Выключено')}
                  className={`shrink-0 relative w-10 h-5 rounded-full transition-colors ${rule.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${rule.isActive ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
                  {triggerLabel(rule.triggerEvent)}
                </span>
                {(rule.actions || []).map((a, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {a.type === 'notify' ? '🔔 уведомление' : '🔗 вебхук'}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs text-gray-400">
                  {t('Сработало')}: {rule.executionCount ?? 0}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(rule)} className="px-3 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded transition-colors">
                    {t('Изменить')}
                  </button>
                  <button onClick={() => remove(rule)} className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors">
                    {t('Удалить')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <RuleFormModal
          rule={editing}
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            await fetchRules();
          }}
        />
      )}
    </div>
  );
}

/* ─── Create / edit modal ─── */

function RuleFormModal({
  rule,
  onClose,
  onSaved,
}: {
  rule: AutomationRule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [saving, setSaving] = useState(false);

  const [entity, setEntity] = useState(() => rule?.triggerEvent?.split('.')[0] || 'task');
  const [action, setAction] = useState(() => rule?.triggerEvent?.split('.')[1] || 'create');
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const [actions, setActions] = useState<RuleAction[]>(
    rule?.actions?.length ? rule.actions : [emptyAction('notify')],
  );

  const updateAction = (idx: number, patch: Partial<RuleAction>) =>
    setActions((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  const removeAction = (idx: number) => setActions((prev) => prev.filter((_, i) => i !== idx));
  const addAction = () => setActions((prev) => [...prev, emptyAction('notify')]);

  const toggleRole = (idx: number, roleId: number) => {
    setActions((prev) =>
      prev.map((a, i) => {
        if (i !== idx) return a;
        const set = new Set(a.roleIds || []);
        if (set.has(roleId)) set.delete(roleId); else set.add(roleId);
        return { ...a, roleIds: [...set] };
      }),
    );
  };

  const save = async () => {
    if (!name.trim()) {
      addToast('error', 'Укажите название правила');
      return;
    }
    // Validate actions
    for (const a of actions) {
      if (a.type === 'notify' && !(a.roleIds?.length)) {
        addToast('error', 'В действии «уведомление» выберите хотя бы одну роль');
        return;
      }
      if (a.type === 'webhook' && !a.url?.trim()) {
        addToast('error', 'В действии «вебхук» укажите URL');
        return;
      }
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      triggerEvent: `${entity}.${action}`,
      isActive,
      actions,
    };

    setSaving(true);
    try {
      if (rule) await api.put(`/automation-rules/${rule.id}`, payload);
      else await api.post('/automation-rules', payload);
      addToast('success', rule ? 'Правило обновлено' : 'Правило создано');
      onSaved();
    } catch {
      addToast('error', 'Не удалось сохранить правило');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            {rule ? t('Изменить правило') : t('Новое правило')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Название')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('Напр.: Уведомить админов об удалении проекта')}
              className="form-input w-full"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Описание')}</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="form-input w-full" />
          </div>

          {/* Trigger */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('Когда срабатывает')}</label>
            <div className="grid grid-cols-2 gap-2">
              <select value={entity} onChange={(e) => setEntity(e.target.value)} className="form-select w-full">
                {ENTITIES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
              <select value={action} onChange={(e) => setAction(e.target.value)} className="form-select w-full">
                {ACTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('Что делать')}</label>
              <button onClick={addAction} className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline">
                + {t('Добавить действие')}
              </button>
            </div>

            <div className="space-y-3">
              {actions.map((a, idx) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={a.type}
                      onChange={(e) => setActions((prev) => prev.map((x, i) => (i === idx ? emptyAction(e.target.value as RuleAction['type']) : x)))}
                      className="form-select text-sm"
                    >
                      <option value="notify">{t('Уведомление')}</option>
                      <option value="webhook">{t('Вебхук (HTTP)')}</option>
                    </select>
                    {actions.length > 1 && (
                      <button onClick={() => removeAction(idx)} className="text-xs text-red-500 hover:underline">{t('Убрать')}</button>
                    )}
                  </div>

                  {a.type === 'notify' ? (
                    <>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Кому (роли)')}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {ROLES.map((r) => {
                            const on = (a.roleIds || []).includes(r.id);
                            return (
                              <button
                                key={r.id}
                                onClick={() => toggleRole(idx, r.id)}
                                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                                  on
                                    ? 'bg-violet-500 border-violet-500 text-white'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-violet-400'
                                }`}
                              >
                                {r.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <input
                        value={a.title || ''}
                        onChange={(e) => updateAction(idx, { title: e.target.value })}
                        placeholder={t('Заголовок (можно {{entityId}}, {{description}})')}
                        className="form-input w-full text-sm"
                      />
                      <input
                        value={a.message || ''}
                        onChange={(e) => updateAction(idx, { message: e.target.value })}
                        placeholder={t('Текст уведомления')}
                        className="form-input w-full text-sm"
                      />
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <input type="checkbox" checked={a.excludeActor ?? false} onChange={(e) => updateAction(idx, { excludeActor: e.target.checked })} />
                        {t('Не уведомлять того, кто совершил действие')}
                      </label>
                    </>
                  ) : (
                    <input
                      value={a.url || ''}
                      onChange={(e) => updateAction(idx, { url: e.target.value })}
                      placeholder="https://example.com/webhook"
                      className="form-input w-full text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            {t('Правило активно')}
          </label>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-gray-800">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            {t('Отмена')}
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 rounded-lg disabled:opacity-50">
            {saving ? t('Сохранение...') : t('Сохранить')}
          </button>
        </div>
      </div>
    </div>
  );
}
