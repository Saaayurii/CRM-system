'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';

interface CreateChannelModalProps {
  onClose: () => void;
}

interface UserOption {
  id: number;
  name: string;
  email: string;
}

export default function CreateChannelModal({ onClose }: CreateChannelModalProps) {
  const [channelType, setChannelType] = useState<'direct' | 'group'>('direct');
  const [channelName, setChannelName] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);

  const createChannel = useChatStore((s) => s.createChannel);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get('/users', { params: { limit: 100 } });
        const list = data.data || data.users || [];
        setUsers(list.map((u: any) => ({ id: u.id, name: u.name || u.email, email: u.email })));
      } catch {
        // silent
      }
    };
    fetchUsers();
  }, []);

  const q = search.trim().toLowerCase();

  // «Избранное» — текущий пользователь, всегда первым
  const selfUser = currentUser ? users.find((u) => u.id === currentUser.id) : null;
  const showSelf = !q || 'избранное'.includes(q) ||
    (selfUser && (selfUser.name.toLowerCase().includes(q) || selfUser.email.toLowerCase().includes(q)));

  // Остальные пользователи без текущего
  const filteredUsers = users
    .filter((u) => u.id !== currentUser?.id)
    .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));

  const toggleUser = (user: UserOption) => {
    if (channelType === 'direct') {
      setSelectedUsers([user]);
    } else {
      setSelectedUsers((prev) =>
        prev.find((u) => u.id === user.id)
          ? prev.filter((u) => u.id !== user.id)
          : [...prev, user]
      );
    }
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) return;
    setLoading(true);

    const channel = await createChannel({
      channelType,
      name: channelType === 'group' ? channelName : undefined,
      memberIds: selectedUsers.map((u) => u.id),
    });

    if (channel) {
      await setActiveChannel(channel.id);
    }

    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Новый чат</h2>

        {/* Channel type toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setChannelType('direct'); setSelectedUsers([]); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              channelType === 'direct'
                ? 'bg-violet-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Личный
          </button>
          <button
            onClick={() => { setChannelType('group'); setSelectedUsers([]); }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              channelType === 'group'
                ? 'bg-violet-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Группа
          </button>
        </div>

        {/* Group name */}
        {channelType === 'group' && (
          <input
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="Название группы"
            className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        )}

        {/* Selected users */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {selectedUsers.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs rounded-full"
              >
                {u.name}
                <button onClick={() => toggleUser(u)} className="hover:text-violet-900 dark:hover:text-violet-100">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* User search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Найти пользователя..."
          className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />

        {/* User list */}
        <div className="max-h-48 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-600 rounded-lg">
          {!showSelf && filteredUsers.length === 0 ? (
            <p className="p-3 text-sm text-gray-400 text-center">Пользователи не найдены</p>
          ) : (
            <>
              {/* Избранное — только в личных чатах, не в группах */}
              {channelType === 'direct' && showSelf && selfUser && (
                <button
                  onClick={() => toggleUser(selfUser)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors border-b border-gray-100 dark:border-gray-700 ${
                    selectedUsers.some((u) => u.id === selfUser.id)
                      ? 'bg-violet-50 dark:bg-violet-500/10'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm shrink-0">
                    ★
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 dark:text-gray-100">Избранное</p>
                    <p className="text-xs text-gray-400 truncate">{selfUser.email}</p>
                  </div>
                  {selectedUsers.some((u) => u.id === selfUser.id) && (
                    <svg className="w-5 h-5 text-violet-500 shrink-0 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )}

              {filteredUsers.map((user) => {
                const isSelected = selectedUsers.some((u) => u.id === user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-violet-50 dark:bg-violet-500/10'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    {isSelected && (
                      <svg className="w-5 h-5 text-violet-500 shrink-0 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || selectedUsers.length === 0 || (channelType === 'group' && !channelName.trim())}
          className="w-full py-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Создание...' : 'Создать'}
        </button>
      </div>
    </div>
  );
}
