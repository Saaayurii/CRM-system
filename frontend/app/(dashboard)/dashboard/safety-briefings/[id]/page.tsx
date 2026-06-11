'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import SignaturePad from '@/components/safety/SignaturePad';
import { useT } from '@/lib/i18n';

interface Topic {
  id: number;
  topic: string;
  description?: string | null;
  sortOrder: number;
}

interface Participant {
  id: number;
  userId: number;
  userName?: string | null;
  userPosition?: string | null;
  status: 'invited' | 'signed' | 'absent' | 'refused';
  signedAt?: string | null;
  signatureData?: string | null;
  validUntil?: string | null;
  notes?: string | null;
}

interface Briefing {
  id: number;
  briefingType: string;
  title: string;
  description?: string | null;
  location?: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt?: string | null;
  conductedAt?: string | null;
  durationMinutes?: number | null;
  validityMonths?: number | null;
  instructorId?: number | null;
  instructorName?: string | null;
  notes?: string | null;
  topics: Topic[];
  participants: Participant[];
  projectId?: number | null;
}

interface UserOption {
  id: number;
  firstName: string;
  lastName: string;
  position?: string | null;
  email?: string;
}

const TYPE_LABELS: Record<string, string> = {
  introductory: 'Вводный',
  primary: 'Первичный',
  repeat: 'Повторный',
  targeted: 'Целевой',
  unscheduled: 'Внеплановый',
};

const STATUS_LABELS: Record<string, string> = {
  planned: 'Запланирован',
  in_progress: 'Идёт',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function fmtDate(v?: string | null): string {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return v;
  }
}

export default function BriefingDetailPage() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const id = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const me = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);

  // Signature
  const [signaturePadValue, setSignaturePadValue] = useState<string | null>(null);
  const [signingFor, setSigningFor] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Participant picker
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Topic management
  const [newTopicText, setNewTopicText] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [topicSubmitting, setTopicSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Briefing>(`/safety-briefings/${id}`);
      setBriefing(data);
    } catch {
      addToast('error', 'Не удалось загрузить инструктаж');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => { if (id) refresh(); }, [id, refresh]);

  useEffect(() => {
    api.get('/users', { params: { limit: 200 } })
      .then(({ data }) => {
        const list: any[] = data.data || data.users || [];
        setUsers(list.map((u: any) => ({
          id: u.id,
          firstName: u.firstName || u.first_name || '',
          lastName: u.lastName || u.last_name || '',
          position: u.position || null,
          email: u.email || '',
        })));
      })
      .catch(() => {});
  }, []);

  if (loading || !briefing) {
    return (
      <div className="px-4 py-8 max-w-9xl mx-auto">
        <div className="text-sm text-gray-500">{t('Загрузка…')}</div>
      </div>
    );
  }

  const meParticipant = briefing.participants.find((p) => p.userId === me?.id);
  const isInstructor = briefing.instructorId === me?.id;
  const canManage = isInstructor || (me?.roleId !== undefined && [1, 2, 3, 9].includes(me.roleId));
  const isCompleted = briefing.status === 'completed';

  const handleConduct = async () => {
    try {
      await api.post(`/safety-briefings/${id}/conduct`);
      addToast('success', 'Инструктаж переведён в статус «Идёт»');
      refresh();
    } catch {
      addToast('error', 'Не удалось обновить статус');
    }
  };

  const handleComplete = async () => {
    try {
      await api.post(`/safety-briefings/${id}/complete`);
      addToast('success', 'Инструктаж завершён');
      refresh();
    } catch {
      addToast('error', 'Не удалось завершить инструктаж');
    }
  };

  const handleSign = async (targetUserId: number) => {
    if (!signaturePadValue) {
      addToast('error', 'Нужна подпись');
      return;
    }
    setSubmitting(true);
    try {
      if (targetUserId === me?.id) {
        await api.post(`/safety-briefings/${id}/sign`, { signatureData: signaturePadValue });
      } else {
        await api.post(`/safety-briefings/${id}/sign-on-behalf`, {
          userId: targetUserId,
          signatureData: signaturePadValue,
        });
      }
      addToast('success', 'Подпись сохранена');
      setSigningFor(null);
      setSignaturePadValue(null);
      refresh();
    } catch {
      addToast('error', 'Не удалось сохранить подпись');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedUser) {
      addToast('error', 'Выберите сотрудника');
      return;
    }
    try {
      await api.post(`/safety-briefings/${id}/participants`, {
        userId: selectedUser.id,
        userName: `${selectedUser.firstName} ${selectedUser.lastName}`.trim() || undefined,
        userPosition: selectedUser.position || undefined,
      });
      setSelectedUser(null);
      setUserSearch('');
      refresh();
    } catch {
      addToast('error', 'Не удалось добавить участника');
    }
  };

  const handleRemoveParticipant = async (participantId: number) => {
    if (!confirm('Удалить участника?')) return;
    try {
      await api.delete(`/safety-briefings/${id}/participants/${participantId}`);
      refresh();
    } catch {
      addToast('error', 'Не удалось удалить участника');
    }
  };

  // Topic management: replaces all topics via PUT
  const handleAddTopic = async () => {
    if (!newTopicText.trim()) return;
    setTopicSubmitting(true);
    try {
      const topics = [
        ...briefing.topics.map((t) => ({ topic: t.topic, description: t.description, sortOrder: t.sortOrder })),
        { topic: newTopicText.trim(), description: newTopicDesc.trim() || null, sortOrder: briefing.topics.length },
      ];
      await api.put(`/safety-briefings/${id}`, { topics });
      setNewTopicText('');
      setNewTopicDesc('');
      refresh();
    } catch {
      addToast('error', 'Не удалось добавить тему');
    } finally {
      setTopicSubmitting(false);
    }
  };

  const handleRemoveTopic = async (topicId: number) => {
    if (!confirm('Удалить тему?')) return;
    try {
      const topics = briefing.topics
        .filter((t) => t.id !== topicId)
        .map((t, idx) => ({ topic: t.topic, description: t.description, sortOrder: idx }));
      await api.put(`/safety-briefings/${id}`, { topics });
      refresh();
    } catch {
      addToast('error', 'Не удалось удалить тему');
    }
  };

  const filteredUsers = users.filter((u) => {
    const name = `${u.firstName} ${u.lastName}`.toLowerCase();
    const q = userSearch.toLowerCase();
    return name.includes(q) || u.email?.toLowerCase().includes(q);
  }).slice(0, 10);

  const signedCount = briefing.participants.filter((p) => p.status === 'signed').length;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <Link href="/dashboard/safety-briefings" className="text-sm text-violet-500 hover:text-violet-600 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Журнал инструктажей
        </Link>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[briefing.status] || ''}`}>
          {STATUS_LABELS[briefing.status]}
        </span>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">{briefing.title}</h1>
        <div className="text-sm text-gray-500 mb-5">
          {TYPE_LABELS[briefing.briefingType] || briefing.briefingType}
          {briefing.validityMonths ? ` · действует ${briefing.validityMonths} мес.` : ''}
          {briefing.durationMinutes ? ` · ${briefing.durationMinutes} мин.` : ''}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div>
            <div className="text-xs text-gray-400 uppercase mb-0.5">{t('Запланирован')}</div>
            <div className="font-medium">{fmtDate(briefing.scheduledAt)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase mb-0.5">{t('Проведён')}</div>
            <div className="font-medium">{fmtDate(briefing.conductedAt)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase mb-0.5">{t('Место')}</div>
            <div className="font-medium">{briefing.location || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase mb-0.5">{t('Инструктор')}</div>
            <div className="font-medium">{briefing.instructorName || (briefing.instructorId ? `#${briefing.instructorId}` : '—')}</div>
          </div>
        </div>

        {briefing.description && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-400 uppercase mb-1">{t('Описание / программа')}</div>
            <div className="whitespace-pre-wrap text-sm">{briefing.description}</div>
          </div>
        )}

        {canManage && !isCompleted && (
          <div className="mt-5 flex gap-2 flex-wrap border-t border-gray-100 dark:border-gray-700 pt-4">
            {briefing.status === 'planned' && (
              <button
                onClick={handleConduct}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
              >
                Начать инструктаж
              </button>
            )}
            {briefing.status === 'in_progress' && (
              <button
                onClick={handleComplete}
                className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium"
              >
                Завершить инструктаж
              </button>
            )}
          </div>
        )}
      </div>

      {/* Topics */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 mb-4">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          Темы инструктажа
        </h2>

        {briefing.topics.length === 0 && !canManage ? (
          <div className="text-sm text-gray-500">{t('Темы не заданы')}</div>
        ) : (
          <ol className="space-y-2 list-decimal list-inside mb-4">
            {briefing.topics.map((t) => (
              <li key={t.id} className="text-sm flex gap-2 items-start group">
                <div className="flex-1">
                  <span className="font-medium">{t.topic}</span>
                  {t.description && (
                    <div className="text-gray-500 mt-0.5 whitespace-pre-wrap">{t.description}</div>
                  )}
                </div>
                {canManage && !isCompleted && (
                  <button
                    onClick={() => handleRemoveTopic(t.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs mt-0.5 shrink-0"
                    title={t('Удалить тему')}
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}

        {canManage && !isCompleted && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
            <div className="text-xs text-gray-500 font-medium mb-2">{t('Добавить тему')}</div>
            <input
              type="text"
              placeholder={t('Название темы *')}
              value={newTopicText}
              onChange={(e) => setNewTopicText(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <textarea
              placeholder={t('Описание / содержание (опционально)')}
              value={newTopicDesc}
              onChange={(e) => setNewTopicDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
            />
            <button
              onClick={handleAddTopic}
              disabled={!newTopicText.trim() || topicSubmitting}
              className="px-3 py-1.5 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {topicSubmitting ? 'Сохраняем…' : 'Добавить тему'}
            </button>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            Участники
            <span className="text-gray-400 text-sm font-normal">
              ({signedCount}/{briefing.participants.length} подписали)
            </span>
          </h2>
        </div>

        {/* Participant picker */}
        {canManage && !isCompleted && (
          <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 font-medium mb-2">{t('Добавить участника')}</div>
            <div className="flex gap-2 items-start">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={t('Поиск по имени или email…')}
                  value={selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setSelectedUser(null);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                {showUserDropdown && !selectedUser && filteredUsers.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedUser(u);
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span className="font-medium">{u.firstName} {u.lastName}</span>
                        {u.email && <span className="text-gray-500 ml-2 text-xs">{u.email}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleAddParticipant}
                disabled={!selectedUser}
                className="px-3 py-1.5 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 shrink-0"
              >
                Добавить
              </button>
            </div>
          </div>
        )}

        {briefing.participants.length === 0 ? (
          <div className="text-sm text-gray-500">{t('Участники не добавлены')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left py-2 px-2">{t('Сотрудник')}</th>
                  <th className="text-left py-2 px-2">{t('Статус')}</th>
                  <th className="text-left py-2 px-2">{t('Подписано')}</th>
                  <th className="text-left py-2 px-2">{t('Действует до')}</th>
                  <th className="text-left py-2 px-2">{t('Подпись')}</th>
                  <th className="text-right py-2 px-2">{t('Действия')}</th>
                </tr>
              </thead>
              <tbody>
                {briefing.participants.map((p) => {
                  const isMe = p.userId === me?.id;
                  const canSignThis = (isMe || isInstructor) && !isCompleted;
                  return (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-2.5 px-2">
                        <div className="font-medium">{p.userName || `#${p.userId}`}</div>
                        {p.userPosition && <div className="text-xs text-gray-500">{p.userPosition}</div>}
                      </td>
                      <td className="py-2.5 px-2">
                        {p.status === 'signed' ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('Подписал')}</span>
                        ) : p.status === 'absent' ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t('Отсутствовал')}</span>
                        ) : p.status === 'refused' ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{t('Отказался')}</span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{t('Приглашён')}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-sm">
                        {p.status === 'signed' ? (
                          <span className="text-green-600 dark:text-green-400">{fmtDate(p.signedAt)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-xs text-gray-600 dark:text-gray-400">
                        {p.validUntil ? fmtDate(p.validUntil) : '—'}
                      </td>
                      <td className="py-2.5 px-2">
                        {p.signatureData ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.signatureData} alt={t('подпись')} className="h-8 border border-gray-200 dark:border-gray-700 rounded bg-white" />
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canSignThis && (
                            <button
                              onClick={() => { setSigningFor(p.userId); setSignaturePadValue(null); }}
                              className="text-violet-600 hover:text-violet-700 text-sm"
                            >
                              {p.status === 'signed' ? 'Перерасписать' : 'Подписать'}
                            </button>
                          )}
                          {canManage && (
                            <button
                              onClick={() => handleRemoveParticipant(p.id)}
                              className="text-red-400 hover:text-red-600"
                              title={t('Удалить')}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sign modal */}
      {signingFor != null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-xl">
            <h3 className="font-semibold text-lg mb-1">
              {signingFor === me?.id ? 'Ваша электронная подпись' : 'Подпись участника'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Распишитесь пальцем или мышью в поле ниже. Подпись подтверждает прохождение инструктажа.
            </p>
            <SignaturePad onChange={(v) => setSignaturePadValue(v)} width={460} height={180} />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setSigningFor(null); setSignaturePadValue(null); }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={() => handleSign(signingFor)}
                disabled={!signaturePadValue || submitting}
                className="px-4 py-2 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 font-medium"
              >
                {submitting ? 'Сохраняем…' : 'Сохранить подпись'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showUserDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setShowUserDropdown(false)} />
      )}
    </div>
  );
}
