'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';
import Badge, { DEFECT_STATUS, DEFECT_SEVERITY } from '@/components/technadzor/Badge';

interface Defect {
  id: number;
  defectNumber?: string;
  defectType?: string;
  category?: string;
  severity?: number;
  title: string;
  description?: string;
  locationDescription?: string;
  reportedByUserId?: number;
  assignedToUserId?: number;
  verifiedByUserId?: number;
  status?: number;
  reportedDate?: string;
  dueDate?: string;
  fixedDate?: string;
  verifiedDate?: string;
  correctionDescription?: string;
  projectId?: number;
  constructionSiteId?: number;
  inspectionId?: number;
  taskId?: number;
  photos?: Array<string | { url?: string; fileUrl?: string }>;
  documents?: Array<string | { url?: string; fileUrl?: string; name?: string }>;
  createdAt?: string;
  updatedAt?: string;
}

const fmtDate = (v?: string) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU');
};

const fileUrl = (f: string | { url?: string; fileUrl?: string }) =>
  typeof f === 'string' ? f : f.url || f.fileUrl || '';

const STAGES = [0, 1, 2, 3, 4, 5];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">{t(label)}</div>
      <div className="text-sm text-gray-800 dark:text-gray-100">{children}</div>
    </div>
  );
}

export default function DefectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);

  const [defect, setDefect] = useState<Defect | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<Record<number, string>>({});
  const [activePhoto, setActivePhoto] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Defect>(`/defects/${id}`);
      setDefect(data);
    } catch {
      setDefect(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/users', { params: { limit: 200 } }).then(({ data }) => {
      const list: any[] = data?.data || data?.users || (Array.isArray(data) ? data : []);
      const map: Record<number, string> = {};
      for (const u of list) {
        map[u.id] = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email || `#${u.id}`;
      }
      setUsers(map);
    }).catch(() => {});
  }, []);

  const patch = async (body: Partial<Defect>, successMsg: string) => {
    if (!defect) return;
    setSaving(true);
    try {
      const { data } = await api.put<Defect>(`/defects/${defect.id}`, body);
      setDefect(data);
      addToast('success', successMsg);
    } catch {
      addToast('error', 'Не удалось обновить дефект');
    } finally {
      setSaving(false);
    }
  };

  const today = () => new Date().toISOString().slice(0, 10);

  const createTask = async () => {
    if (!defect) return;
    setSaving(true);
    try {
      const priority = Math.min(4, Math.max(1, defect.severity ?? 2));
      const { data: task } = await api.post('/tasks', {
        title: `Устранить дефект: ${defect.title}`,
        description: defect.description || defect.locationDescription || undefined,
        projectId: defect.projectId,
        priority,
      });
      if (task?.id) {
        await api.put(`/defects/${defect.id}`, { taskId: task.id });
        setDefect((d) => (d ? { ...d, taskId: task.id } : d));
        addToast('success', 'Задача создана и связана с дефектом');
      }
    } catch {
      addToast('error', 'Не удалось создать задачу');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        <div className="animate-pulse h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  if (!defect) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        <p className="text-gray-500 dark:text-gray-400">{t('Дефект не найден')}</p>
        <Link href="/dashboard/technadzor/defects" className="text-violet-500 hover:text-violet-600 text-sm">← {t('К списку дефектов')}</Link>
      </div>
    );
  }

  const st = DEFECT_STATUS[defect.status ?? 0] ?? DEFECT_STATUS[0];
  const sev = defect.severity != null ? DEFECT_SEVERITY[defect.severity] : undefined;
  const photos = (defect.photos ?? []).map(fileUrl).filter(Boolean);
  const docs = defect.documents ?? [];
  const overdue = defect.dueDate && (defect.status ?? 0) < 3 && new Date(defect.dueDate) < new Date();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
        <Link href="/dashboard/technadzor" className="text-violet-500 hover:text-violet-600">{t('Технадзор')}</Link>
        <span>›</span>
        <Link href="/dashboard/technadzor/defects" className="text-violet-500 hover:text-violet-600">{t('Все дефекты')}</Link>
        <span>›</span>
        <span className="text-gray-700 dark:text-gray-200">{defect.defectNumber || `#${defect.id}`}</span>
      </nav>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{defect.defectNumber || `DEF-${defect.id}`}</h1>
            <Badge label={t(st.label)} color={st.color} />
            {sev && <Badge label={t(sev.label)} color={sev.color} />}
          </div>
          <p className="mt-1 text-lg text-gray-700 dark:text-gray-200">{defect.title}</p>
          {defect.locationDescription && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">📍 {defect.locationDescription}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="Статус">
              <select
                value={defect.status ?? 0}
                disabled={saving}
                onChange={(e) => patch({ status: Number(e.target.value) }, 'Статус обновлён')}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-gray-800 dark:text-gray-100"
              >
                {Object.entries(DEFECT_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{t(v.label)}</option>
                ))}
              </select>
            </Field>
            <Field label="Тип">{defect.defectType || '—'}</Field>
            <Field label="Категория">{defect.category || '—'}</Field>
            <Field label="Создан">{fmtDate(defect.createdAt)}</Field>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Описание')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{defect.description || t('Описание не указано')}</p>
            {defect.correctionDescription && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('Описание устранения')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{defect.correctionDescription}</p>
              </div>
            )}
          </div>

          {photos.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Фото дефекта')} ({photos.length})</h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos[activePhoto]} alt="" className="w-full max-h-[420px] object-contain rounded-xl bg-gray-50 dark:bg-gray-900" />
              {photos.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
                  {photos.map((p, i) => (
                    <button key={i} onClick={() => setActivePhoto(i)} className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${i === activePhoto ? 'border-violet-500' : 'border-transparent'}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {docs.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Файлы')}</h3>
              <ul className="space-y-2">
                {docs.map((d, i) => {
                  const url = fileUrl(d);
                  const name = typeof d === 'object' && d.name ? d.name : url.split('/').pop() || `file-${i}`;
                  return (
                    <li key={i}>
                      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:underline">
                        <span>📄</span> {name}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Назначение')}</h3>
            <Field label="Кто выявил">{defect.reportedByUserId ? users[defect.reportedByUserId] || `#${defect.reportedByUserId}` : '—'}</Field>
            <div className="mt-3"><Field label="Исполнитель">{defect.assignedToUserId ? users[defect.assignedToUserId] || `#${defect.assignedToUserId}` : '—'}</Field></div>
            <div className="mt-3"><Field label="Проверил">{defect.verifiedByUserId ? users[defect.verifiedByUserId] || `#${defect.verifiedByUserId}` : '—'}</Field></div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Сроки и контроль')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Выявлен">{fmtDate(defect.reportedDate)}</Field>
              <Field label="Плановый срок"><span className={overdue ? 'text-red-500 font-medium' : ''}>{fmtDate(defect.dueDate)}</span></Field>
              <Field label="Устранён">{fmtDate(defect.fixedDate)}</Field>
              <Field label="Проверен">{fmtDate(defect.verifiedDate)}</Field>
            </div>
            <div className="flex items-center justify-between mt-4">
              {STAGES.map((s) => {
                const reached = (defect.status ?? 0) >= s;
                return (
                  <div key={s} className="flex flex-col items-center flex-1">
                    <span className={`w-3 h-3 rounded-full ${reached ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                    <span className="text-[9px] mt-1 text-gray-400 text-center leading-tight">{t(DEFECT_STATUS[s].label)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Связи')}</h3>
            <div className="space-y-2 text-sm">
              {defect.inspectionId ? (
                <Link href={`/dashboard/technadzor/inspections/${defect.inspectionId}`} className="block text-violet-600 dark:text-violet-400 hover:underline">🔍 {t('Инспекция')} #{defect.inspectionId}</Link>
              ) : <p className="text-gray-400">{t('Инспекция не привязана')}</p>}
              {defect.taskId ? (
                <Link href={`/dashboard/tasks?id=${defect.taskId}`} className="block text-violet-600 dark:text-violet-400 hover:underline">✅ {t('Задача')} #{defect.taskId}</Link>
              ) : <p className="text-gray-400">{t('Задача не создана')}</p>}
              {defect.projectId && <p className="text-gray-500 dark:text-gray-400">🏢 {t('Проект')} #{defect.projectId}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs space-y-2">
            <button disabled={saving} onClick={() => patch({ status: 3, fixedDate: today() }, 'Дефект отмечен устранённым')} className="w-full py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50">{t('Отметить как устранённый')}</button>
            <button disabled={saving} onClick={() => patch({ status: 4, verifiedDate: today() }, 'Дефект проверен')} className="w-full py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50">{t('Отправить на проверку')}</button>
            <button disabled={saving || !!defect.taskId} onClick={createTask} className="w-full py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50">{defect.taskId ? t('Задача уже создана') : t('Создать задачу')}</button>
            <button disabled={saving} onClick={() => patch({ status: 5 }, 'Дефект закрыт')} className="w-full py-2 rounded-lg text-sm font-medium border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50">{t('Закрыть дефект')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
