'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface TeamMember {
  id: number;
  name?: string;
  email?: string;
  position?: string;
  role?: { name: string };
}

interface Team {
  id: number;
  name: string;
  members?: TeamMember[];
}

export default function TeamWidget() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const { data } = await api.get('/teams', { params: { limit: 5 } });
        const teamList = data.data || data.teams || [];
        setTeams(teamList.slice(0, 3));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Команды</h3>
      {loading ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Загрузка...</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Нет команд</p>
      ) : (
        <ul className="space-y-3">
          {teams.map((team) => (
            <li key={team.id} className="border border-gray-100 dark:border-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-violet-100 dark:bg-violet-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{team.name}</span>
              </div>
              {team.members && team.members.length > 0 ? (
                <div className="flex -space-x-2">
                  {team.members.slice(0, 5).map((m, i) => (
                    <div
                      key={m.id || i}
                      className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300"
                      title={m.name || m.email || ''}
                    >
                      {(m.name || m.email || '?').charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {team.members.length > 5 && (
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs text-gray-500">
                      +{team.members.length - 5}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500">Нет участников</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
