'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import SignaturePad from '@/components/safety/SignaturePad';

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
  const params = useParams();
  const router = useRouter();
  const id = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const me = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);

  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [signaturePadValue, setSignaturePadValue] = useState<string | null>(null);
  const [signingFor, setSigningFor] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // For instructor: add participant
  const [newUserId, setNewUserId] = useState<string>('');
  const [newUserName, setNewUserName] = useState<string>('');

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

  useEffect(() => {
    if (id) refresh();
  }, [id, refresh]);

  if (loading || !briefing) {
    return (
      <div className="px-4 py-8 max-w-9xl mx-auto">
        <div className="text-sm text-gray-500">Загрузка…</div>
      </div>
    );
  }

  const meParticipant = briefing.participants.find((p) => p.userId === me?.id);
  const isInstructor = briefing.instructorId === me?.id;
  const canManage = isInstructor || (me?.roleId !== undefined && [1, 2, 3].includes(me.roleId));
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
        await api.post(`/safety-briefings/${id}/sign`, {
          signatureData: signaturePadValue,
        });
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
    const userId = Number(newUserId);
    if (!userId) {
      addToast('error', 'Укажите ID пользователя');
      return;
    }
    try {
      await api.post(`/safety-briefings/${id}/participants`, {
        userId,
        userName: newUserName || undefined,
      });
      setNewUserId('');
      setNewUserName('');
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

  const signedCount = briefing.participants.filter((p) => p.status === 'signed').length;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
        <Link
          href="/dashboard/safety-briefings"
          className="text-sm text-violet-500 hover:text-violet-600"
        >
          ← Журнал инструктажей
        </Link>
        <div className="text-sm text-gray-500">
          Статус: <span className="font-semibold">{STATUS_LABELS[briefing.status]}</span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 mb-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
          {briefing.title}
        </h1>
        <div className="text-sm text-gray-500 mb-4">
          {TYPE_LABELS[briefing.briefingType] || briefing.briefingType} ·
          {briefing.validityMonths ? ` действует ${briefing.validityMonths} мес.` : ''}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-gray-500">Запланирован</div>
            <div className="font-medium">{fmtDate(briefing.scheduledAt)}</div>
          </div>
          <div>
            <div className="text-gray-500">Проведён</div>
            <div className="font-medium">{fmtDate(briefing.conductedAt)}</div>
          </div>
          <div>
            <div className="text-gray-500">Место</div>
            <div className="font-medium">{briefing.location || '—'}</div>
          </div>
          <div>
            <div className="text-gray-500">Инструктор</div>
            <div className="font-medium">{briefing.instructorName || (briefing.instructorId ? `#${briefing.instructorId}` : '—')}</div>
          </div>
        </div>

        {briefing.description && (
          <div className="mt-4">
            <div className="text-gray-500 text-sm">Описание / программа</div>
            <div className="whitespace-pre-wrap text-sm mt-1">{briefing.description}</div>
          </div>
        )}

        {canManage && !isCompleted && (
          <div className="mt-4 flex gap-2 flex-wrap">
            {briefing.status === 'planned' && (
              <button
                onClick={handleConduct}
                className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Начать инструктаж
              </button>
            )}
            {briefing.status === 'in_progress' && (
              <button
                onClick={handleComplete}
                className="px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700"
              >
                Завершить инструктаж
              </button>
            )}
            <button
              onClick={() => router.push('/dashboard/safety-briefings')}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
            >
              К списку
            </button>
          </div>
        )}
      </div>

      {/* Topics */}
      {briefing.topics.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 mb-4">
          <h2 className="font-semibold mb-3">Темы инструктажа</h2>
          <ol className="space-y-2 list-decimal list-inside">
            {briefing.topics.map((t) => (
              <li key={t.id} className="text-sm">
                <span className="font-medium">{t.topic}</span>
                {t.description && (
                  <div className="text-gray-500 ml-5 mt-0.5 whitespace-pre-wrap">{t.description}</div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Participants */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">
            Участники <span className="text-gray-500 text-sm">({signedCount}/{briefing.participants.length} подписали)</span>
          </h2>
        </div>

        {canManage && (
          <div className="mb-4 flex flex-wrap items-end gap-2 p-3 rounded bg-gray-50 dark:bg-gray-900">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">ID пользователя</label>
              <input
                type="number"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-0.5">ФИО (опционально)</label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              />
            </div>
            <button
              onClick={handleAddParticipant}
              className="px-3 py-1.5 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700"
            >
              Добавить
            </button>
          </div>
        )}

        {briefing.participants.length === 0 ? (
          <div className="text-sm text-gray-500">Участники не добавлены</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase">
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-2">Сотрудник</th>
                <th className="text-left py-2 px-2">Подписано</th>
                <th className="text-left py-2 px-2">Действует до</th>
                <th className="text-left py-2 px-2">Подпись</th>
                <th className="text-right py-2 px-2">Действия</th>
              </tr>
            </thead>
            <tbody>
              {briefing.participants.map((p) => {
                const isMe = p.userId === me?.id;
                const canSignThis = (isMe || isInstructor) && !isCompleted;
                return (
                  <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <td className="py-2 px-2">
                      <div className="font-medium">{p.userName || `#${p.userId}`}</div>
                      {p.userPosition && (
                        <div className="text-xs text-gray-500">{p.userPosition}</div>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      {p.status === 'signed' ? (
                        <span className="text-green-600">{fmtDate(p.signedAt)}</span>
                      ) : (
                        <span className="text-gray-400">не подписано</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs text-gray-600 dark:text-gray-400">
                      {p.validUntil ? fmtDate(p.validUntil) : '—'}
                    </td>
                    <td className="py-2 px-2">
                      {p.signatureData ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.signatureData}
                          alt="подпись"
                          className="h-10 border border-gray-200 dark:border-gray-700 rounded bg-white"
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {canSignThis && (
                        <button
                          onClick={() => {
                            setSigningFor(p.userId);
                            setSignaturePadValue(null);
                          }}
                          className="text-violet-600 hover:text-violet-700 text-sm"
                        >
                          {p.status === 'signed' ? 'Перерасписаться' : 'Подписать'}
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={() => handleRemoveParticipant(p.id)}
                          className="ml-3 text-red-500 hover:text-red-700 text-sm"
                          title="Удалить"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Sign modal */}
      {signingFor != null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full">
            <h3 className="font-semibold text-lg mb-3">
              {signingFor === me?.id ? 'Ваша подпись' : `Подпись участника #${signingFor}`}
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              Распишитесь пальцем или мышью в поле ниже. Это электронное подтверждение
              прохождения инструктажа.
            </p>
            <SignaturePad
              onChange={(v) => setSignaturePadValue(v)}
              width={460}
              height={180}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setSigningFor(null);
                  setSignaturePadValue(null);
                }}
                className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={() => handleSign(signingFor)}
                disabled={!signaturePadValue || submitting}
                className="px-3 py-1.5 text-sm rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {submitting ? 'Сохраняем…' : 'Сохранить подпись'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
