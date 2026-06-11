'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';

interface UserOption {
  id: number;
  name: string;
  email: string;
  roleId?: number;
}

interface Assignee {
  userId: number;
  userName?: string;
}

interface AssignUsersModalProps {
  open: boolean;
  taskId: number | null;
  currentAssignees: Assignee[];
  /** Если у задачи задан список требуемых типов инструктажей — показываем warning. */
  requiresBriefingTypes?: string[];
  onClose: () => void;
  onSaved: () => void;
}

const BRIEFING_TYPE_LABELS: Record<string, string> = {
  introductory: 'Вводный',
  primary: 'Первичный',
  repeat: 'Повторный',
  targeted: 'Целевой',
  unscheduled: 'Внеплановый',
};

export default function AssignUsersModal({
  open,
  taskId,
  currentAssignees,
  requiresBriefingTypes,
  onClose,
  onSaved,
}: AssignUsersModalProps) {
  const t = useT();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  /** userId → список отсутствующих типов инструктажей */
  const [missingByUser, setMissingByUser] = useState<Record<number, string[]>>({});

  // Load users when modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get('/users', { params: { limit: 100 } })
      .then(({ data }) => {
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data.users)
          ? data.users
          : Array.isArray(data.data)
          ? data.data
          : [];
        setUsers(arr as UserOption[]);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [open]);

  // Pre-select current assignees
  useEffect(() => {
    if (open) {
      setSelected(new Set(currentAssignees.map((a) => a.userId)));
      setSearch('');
      setMissingByUser({});
    }
  }, [open, currentAssignees]);

  // Refresh missing briefings whenever selected users change
  useEffect(() => {
    if (!open) return;
    if (!requiresBriefingTypes?.length) return;
    const types = requiresBriefingTypes.join(',');
    const ids = Array.from(selected);
    if (ids.length === 0) {
      setMissingByUser({});
      return;
    }

    let cancelled = false;
    Promise.all(
      ids.map((uid) =>
        api
          .get<{ missing: string[] }>(`/safety-briefings/users/${uid}/missing`, {
            params: { types },
          })
          .then(({ data }) => ({ uid, missing: data?.missing ?? [] }))
          .catch(() => ({ uid, missing: [] as string[] })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<number, string[]> = {};
      for (const r of results) {
        if (r.missing.length > 0) next[r.uid] = r.missing;
      }
      setMissingByUser(next);
    });
    return () => {
      cancelled = true;
    };
  }, [open, selected, requiresBriefingTypes]);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!taskId) return;
    setSaving(true);
    try {
      // Send both userIds and userNames so backend can store display names
      const assignees = Array.from(selected).map((uid) => {
        const u = users.find((u) => u.id === uid);
        return { userId: uid, userName: u?.name ?? null };
      });
      await api.post(`/tasks/${taskId}/assignees`, { assignees });
      onSaved();
      onClose();
    } catch {
      // Error toast handled globally
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Назначить исполнителей
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Поиск по имени или email...')}
            className="form-input w-full text-sm"
          />
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {loading ? (
            <p className="py-6 text-center text-gray-500 dark:text-gray-400 text-sm">{t('Загрузка...')}</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-gray-500 dark:text-gray-400 text-sm">{t('Пользователи не найдены')}</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((user) => {
                const missing = missingByUser[user.id];
                const isSelected = selected.has(user.id);
                return (
                  <li key={user.id}>
                    <label className="flex items-start gap-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/20 px-1 rounded">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(user.id)}
                        className="w-4 h-4 accent-violet-500 mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        {isSelected && missing && missing.length > 0 && (
                          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded px-2 py-1">
                            ⚠ Нет актуального инструктажа:{' '}
                            {missing.map((m) => BRIEFING_TYPE_LABELS[m] ?? m).join(', ')}
                          </p>
                        )}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {requiresBriefingTypes && requiresBriefingTypes.length > 0 && (
          <div className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
            Задача требует инструктажей:{' '}
            <span className="font-semibold">
              {requiresBriefingTypes
                .map((t) => BRIEFING_TYPE_LABELS[t] ?? t)
                .join(', ')}
            </span>
            . Назначение возможно, но участникам без актуального инструктажа сначала
            нужно его пройти.
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Выбрано: {selected.size}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-sm bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-60"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
