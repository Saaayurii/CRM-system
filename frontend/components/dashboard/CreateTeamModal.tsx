'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useChatStore } from '@/stores/chatStore';

interface User {
  id: number;
  name?: string;
  email?: string;
  avatarUrl?: string;
  position?: string;
}

interface CreateTeamModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function getInitials(name?: string, email?: string): string {
  return ((name || email || '?').charAt(0)).toUpperCase();
}

export default function CreateTeamModal({ onClose, onCreated }: CreateTeamModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [createChat, setCreateChat] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const createChannel = useChatStore((s) => s.createChannel);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (search.length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get('/users', { params: { search, limit: 10 } });
        const users: User[] = data.data || data.users || [];
        setSearchResults(users.filter((u) => !selectedMembers.some((m) => m.id === u.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [search, selectedMembers]);

  const addMember = (user: User) => {
    setSelectedMembers((prev) => [...prev, user]);
    setSearch('');
    setSearchResults([]);
  };

  const removeMember = (id: number) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Название обязательно'); return; }
    setLoading(true);
    setError('');
    try {
      // 1. Create the team
      const { data: team } = await api.post('/teams', {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      // 2. Add selected members
      if (selectedMembers.length > 0) {
        await Promise.all(
          selectedMembers.map((m) =>
            api.post(`/teams/${team.id}/members`, { userId: m.id }).catch(() => {})
          )
        );
      }

      // 3. Create group chat if requested
      if (createChat && selectedMembers.length > 0) {
        await createChannel({
          channelType: 'group',
          name: name.trim(),
          memberIds: selectedMembers.map((m) => m.id),
        });
      }

      onCreated();
    } catch {
      setError('Не удалось создать команду');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md mx-4 p-6 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Создать команду</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Название <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Название команды"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              placeholder="Описание команды"
            />
          </div>

          {/* Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Участники
            </label>

            {/* Selected members chips */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-1.5 px-2 py-1 bg-violet-50 dark:bg-violet-500/10 rounded-lg"
                  >
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-medium">
                        {getInitials(m.name, m.email)}
                      </div>
                    )}
                    <span className="text-xs text-violet-700 dark:text-violet-300 font-medium">
                      {m.name || m.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeMember(m.id)}
                      className="text-violet-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                placeholder="Поиск пользователей..."
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {searchResults.length > 0 && (
                <ul className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {searchResults.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => addMember(u)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                            {getInitials(u.name, u.email)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-gray-800 dark:text-gray-100 font-medium truncate">{u.name || u.email}</div>
                          {u.name && u.email && (
                            <div className="text-xs text-gray-400 truncate">{u.email}</div>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Create chat toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setCreateChat((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${createChat ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${createChat ? 'translate-x-5' : ''}`} />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Создать групповой чат</div>
              <div className="text-xs text-gray-400">Чат с выбранными участниками команды</div>
            </div>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
