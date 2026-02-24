'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface UserOption {
  id: number;
  name: string;
  email: string;
}

interface ManageMembersModalProps {
  open: boolean;
  teamId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ManageMembersModal({
  open,
  teamId,
  onClose,
  onSaved,
}: ManageMembersModalProps) {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [initialMemberIds, setInitialMemberIds] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open || !teamId) return;
    setLoading(true);

    Promise.all([
      api.get('/users', { params: { limit: 200 } }),
      api.get(`/teams/${teamId}/members`),
    ])
      .then(([usersRes, membersRes]) => {
        const usersData = usersRes.data;
        const arr: UserOption[] = Array.isArray(usersData)
          ? usersData
          : Array.isArray(usersData?.users)
          ? usersData.users
          : Array.isArray(usersData?.data)
          ? usersData.data
          : [];
        setUsers(arr);

        const membersData = membersRes.data;
        const memberArr: { userId: number }[] = Array.isArray(membersData)
          ? membersData
          : Array.isArray(membersData?.data)
          ? membersData.data
          : [];
        const ids = new Set(memberArr.map((m) => m.userId));
        setInitialMemberIds(ids);
        setSelected(new Set(ids));
        setSearch('');
      })
      .catch(() => {
        setUsers([]);
        setInitialMemberIds(new Set());
        setSelected(new Set());
      })
      .finally(() => setLoading(false));
  }, [open, teamId]);

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
    if (!teamId) return;
    setSaving(true);
    try {
      const toAdd = [...selected].filter((id) => !initialMemberIds.has(id));
      const toRemove = [...initialMemberIds].filter((id) => !selected.has(id));

      await Promise.all([
        ...toAdd.map((userId) =>
          api.post(`/teams/${teamId}/members`, { userId }),
        ),
        ...toRemove.map((userId) =>
          api.delete(`/teams/${teamId}/members/${userId}`),
        ),
      ]);

      onSaved();
      onClose();
    } catch {
      // Error handled globally
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
            Участники команды
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
            placeholder="Поиск по имени или email..."
            className="form-input w-full text-sm"
          />
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {loading ? (
            <p className="py-6 text-center text-gray-500 dark:text-gray-400 text-sm">Загрузка...</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-gray-500 dark:text-gray-400 text-sm">Пользователи не найдены</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map((user) => (
                <li key={user.id}>
                  <label className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/20 px-1 rounded">
                    <input
                      type="checkbox"
                      checked={selected.has(user.id)}
                      onChange={() => toggle(user.id)}
                      className="w-4 h-4 accent-violet-500"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

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
