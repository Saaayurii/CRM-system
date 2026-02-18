'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import CreateTeamModal from '@/components/dashboard/CreateTeamModal';

interface TeamMember {
  id: number;
  name?: string;
  email?: string;
  position?: string;
}

interface Team {
  id: number;
  name: string;
  description?: string;
  project?: { id: number; name: string };
  projectName?: string;
  members?: TeamMember[];
}

interface User {
  id: number;
  name?: string;
  email?: string;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/teams');
      const teamList: Team[] = data.data || data.teams || [];

      // Fetch members for each team
      const teamsWithMembers = await Promise.all(
        teamList.map(async (team) => {
          try {
            const { data: membersData } = await api.get(`/teams/${team.id}/members`);
            return { ...team, members: membersData.data || membersData.members || membersData || [] };
          } catch {
            return team;
          }
        })
      );

      setTeams(teamsWithMembers);
      setError('');
    } catch {
      setError('Не удалось загрузить команды');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const searchUsers = async (query: string) => {
    setUserSearch(query);
    if (query.length < 2) {
      setUsers([]);
      return;
    }
    setUsersLoading(true);
    try {
      const { data } = await api.get('/users', { params: { search: query, limit: 10 } });
      setUsers(data.data || data.users || []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleAddMember = async (teamId: number, userId: number) => {
    try {
      await api.post(`/teams/${teamId}/members`, { userId });
      addToast('success', 'Участник добавлен');
      setAddMemberTeamId(null);
      setUserSearch('');
      setUsers([]);
      fetchTeams();
    } catch {
      addToast('error', 'Не удалось добавить участника');
    }
  };

  const handleRemoveMember = async (teamId: number, userId: number, userName: string) => {
    if (!confirm(`Удалить ${userName} из команды?`)) return;
    try {
      await api.delete(`/teams/${teamId}/members/${userId}`);
      addToast('success', 'Участник удалён');
      fetchTeams();
    } catch {
      addToast('error', 'Не удалось удалить участника');
    }
  };

  const getInitial = (name?: string, email?: string): string => {
    return (name || email || '?').charAt(0).toUpperCase();
  };

  return (
    <div>
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Команды</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Управление командами проектов</p>
        </div>
        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <Link href="/dashboard" className="text-sm text-violet-500 hover:text-violet-600">
            &larr; Назад
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Создать команду
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Загрузка...</div>
      ) : error ? (
        <div className="p-8 text-center text-red-500">{error}</div>
      ) : teams.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">Команды не найдены</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5"
            >
              {/* Team header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{team.name}</h3>
                  {team.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{team.description}</p>
                  )}
                </div>
                <div className="w-9 h-9 bg-violet-100 dark:bg-violet-500/20 rounded-lg flex items-center justify-center shrink-0 ml-3">
                  <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
              </div>

              {/* Project badge */}
              {(team.project?.name || team.projectName) && (
                <div className="mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400">
                    {team.project?.name || team.projectName}
                  </span>
                </div>
              )}

              {/* Members */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Участники ({team.members?.length || 0})
                  </span>
                </div>
                {team.members && team.members.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {team.members.map((m) => (
                      <div
                        key={m.id}
                        className="group relative flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                          {getInitial(m.name, m.email)}
                        </div>
                        <span className="text-xs text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                          {m.name || m.email}
                        </span>
                        <button
                          onClick={() => handleRemoveMember(team.id, m.id, m.name || m.email || '')}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity ml-0.5"
                          title="Удалить из команды"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500">Нет участников</p>
                )}
              </div>

              {/* Add member */}
              {addMemberTeamId === team.id ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => searchUsers(e.target.value)}
                    placeholder="Поиск пользователя..."
                    autoFocus
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                  {usersLoading && (
                    <p className="text-xs text-gray-400">Поиск...</p>
                  )}
                  {users.length > 0 && (
                    <ul className="max-h-32 overflow-y-auto space-y-1">
                      {users.map((u) => (
                        <li key={u.id}>
                          <button
                            onClick={() => handleAddMember(team.id, u.id)}
                            className="w-full text-left px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            {u.name || u.email}
                            {u.name && u.email && (
                              <span className="text-xs text-gray-400 ml-2">{u.email}</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => {
                      setAddMemberTeamId(null);
                      setUserSearch('');
                      setUsers([]);
                    }}
                    className="text-xs text-gray-400 hover:text-gray-500"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddMemberTeamId(team.id)}
                  className="w-full mt-1 px-3 py-1.5 text-sm font-medium text-violet-500 hover:text-violet-600 border border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 rounded-lg transition-colors"
                >
                  + Добавить участника
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTeamModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            addToast('success', 'Команда создана');
            fetchTeams();
          }}
        />
      )}
    </div>
  );
}
