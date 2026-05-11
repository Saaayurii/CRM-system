'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import CreateTeamModal from '@/components/dashboard/CreateTeamModal';
import { useDownloadPdf } from '@/lib/hooks/useDownloadPdf';

interface TeamMember {
  id: number;        // teamMember record ID
  userId: number;    // actual user ID
  roleInTeam?: string;
  user?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
    position?: string;
  };
}

interface Team {
  id: number;
  name: string;
  description?: string;
  members?: TeamMember[];
}

interface UserDetail {
  userId: number;
  name?: string;
  email?: string;
  avatarUrl?: string;
  position?: string;
  roleInTeam?: string;
  teamName: string;
}

function getInitials(name?: string, email?: string): string {
  return ((name || email || '?').charAt(0)).toUpperCase();
}

function MemberAvatar({ member, onClick }: { member: TeamMember; onClick: () => void }) {
  const name = member.user?.name;
  const email = member.user?.email;
  const avatarUrl = member.user?.avatarUrl;

  return (
    <button
      onClick={onClick}
      title={name || email}
      className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-white dark:ring-gray-800 hover:ring-violet-400 transition-all hover:scale-110 focus:outline-none"
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={name || email || ''} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-violet-400 to-sky-500 flex items-center justify-center text-white text-sm font-semibold">
          {getInitials(name, email)}
        </div>
      )}
    </button>
  );
}

function UserDetailModal({ user, onClose }: { user: UserDetail; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-xs mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full overflow-hidden mb-3 ring-4 ring-violet-100 dark:ring-violet-500/20">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-400 to-sky-500 flex items-center justify-center text-white text-2xl font-bold">
                {getInitials(user.name, user.email)}
              </div>
            )}
          </div>

          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            {user.name || user.email || 'Пользователь'}
          </h3>

          {user.position && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user.position}</p>
          )}

          {user.roleInTeam && (
            <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400">
              {user.roleInTeam === 'lead' ? 'Лидер' : user.roleInTeam === 'assistant' ? 'Помощник' : 'Участник'}
            </span>
          )}

          <div className="mt-4 w-full space-y-2 text-left">
            {user.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="truncate">{user.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{user.teamName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const { download: downloadPdf, loading: pdfLoading } = useDownloadPdf();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: number; name?: string; email?: string }[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/teams');
      const teamList: Team[] = data.data || data.teams || [];

      const teamsWithMembers = await Promise.all(
        teamList.map(async (team) => {
          try {
            const { data: membersData } = await api.get(`/teams/${team.id}/members`);
            const raw = membersData.data || membersData.members || membersData || [];
            return { ...team, members: Array.isArray(raw) ? raw : [] };
          } catch {
            return { ...team, members: [] };
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

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const searchUsers = async (query: string) => {
    setUserSearch(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setUsersLoading(true);
    try {
      const { data } = await api.get('/users', { params: { search: query, limit: 10 } });
      setSearchResults(data.data || data.users || []);
    } catch {
      setSearchResults([]);
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
      setSearchResults([]);
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

  const openEditTeam = (team: Team) => {
    setEditTeam(team);
    setEditName(team.name);
    setEditDescription(team.description || '');
  };

  const handleEditSave = async () => {
    if (!editTeam || !editName.trim()) return;
    setEditSaving(true);
    try {
      await api.put(`/teams/${editTeam.id}`, { name: editName.trim(), description: editDescription.trim() || undefined });
      addToast('success', 'Команда обновлена');
      setEditTeam(null);
      fetchTeams();
    } catch {
      addToast('error', 'Не удалось обновить команду');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!confirmDeleteTeam) return;
    setDeleting(true);
    try {
      await api.delete(`/teams/${confirmDeleteTeam.id}`);
      addToast('success', 'Команда удалена');
      setConfirmDeleteTeam(null);
      fetchTeams();
    } catch {
      addToast('error', 'Не удалось удалить команду');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Команды</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Управление командами проектов</p>
        </div>
        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <button
            onClick={() => downloadPdf('teams', 'Команды', teams.map((t) => ({
              Название: t.name,
              Описание: t.description || '—',
              Участников: t.members?.length ?? 0,
            })))}
            disabled={pdfLoading || teams.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {pdfLoading ? 'PDF...' : 'PDF'}
          </button>
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
            <div key={team.id} className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 truncate">{team.name}</h3>
                  {team.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{team.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => openEditTeam(team)}
                    className="p-1.5 text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors"
                    title="Редактировать"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setConfirmDeleteTeam(team)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Members */}
              <div className="mb-3">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2 block">
                  Участники ({team.members?.length ?? 0})
                </span>

                {team.members && team.members.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1">
                    {/* Stacked avatars */}
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 6).map((m) => (
                        <MemberAvatar
                          key={m.id}
                          member={m}
                          onClick={() =>
                            setSelectedUser({
                              userId: m.userId,
                              name: m.user?.name,
                              email: m.user?.email,
                              avatarUrl: m.user?.avatarUrl,
                              position: m.user?.position,
                              roleInTeam: m.roleInTeam,
                              teamName: team.name,
                            })
                          }
                        />
                      ))}
                      {(team.members.length > 6) && (
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 ring-2 ring-white dark:ring-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                          +{team.members.length - 6}
                        </div>
                      )}
                    </div>

                    {/* Remove buttons on hover — separate list */}
                    <div className="flex flex-wrap gap-1 mt-2 w-full">
                      {team.members.map((m) => {
                        const label = m.user?.name || m.user?.email || `#${m.userId}`;
                        return (
                          <div
                            key={m.id}
                            className="group flex items-center gap-1 px-2 py-0.5 bg-gray-50 dark:bg-gray-700/50 rounded-md text-xs text-gray-600 dark:text-gray-300"
                          >
                            <span className="truncate max-w-[90px]">{label}</span>
                            <button
                              onClick={() => handleRemoveMember(team.id, m.userId, label)}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
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
                  {usersLoading && <p className="text-xs text-gray-400">Поиск...</p>}
                  {searchResults.length > 0 && (
                    <ul className="max-h-32 overflow-y-auto space-y-1">
                      {searchResults.map((u) => (
                        <li key={u.id}>
                          <button
                            onClick={() => handleAddMember(team.id, u.id)}
                            className="w-full text-left px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            {u.name || u.email}
                            {u.name && u.email && <span className="text-xs text-gray-400 ml-2">{u.email}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => { setAddMemberTeamId(null); setUserSearch(''); setSearchResults([]); }}
                    className="text-xs text-gray-400 hover:text-gray-500"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddMemberTeamId(team.id)}
                  className="w-full mt-2 px-3 py-1.5 text-sm font-medium text-violet-500 hover:text-violet-600 border border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 rounded-lg transition-colors"
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

      {selectedUser && (
        <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {/* Edit team modal */}
      {editTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Редактировать команду</h2>
              <button onClick={() => setEditTeam(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Описание</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setEditTeam(null)}
                disabled={editSaving}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving || !editName.trim()}
                className="px-4 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {editSaving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete team confirmation */}
      {confirmDeleteTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Удалить команду?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Команда <span className="font-medium text-gray-700 dark:text-gray-300">{confirmDeleteTeam.name}</span> будет удалена без возможности восстановления.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteTeam(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteTeam}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {deleting && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
