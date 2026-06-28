'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useT } from '@/lib/i18n';
import Badge, { DEFECT_STATUS, DEFECT_SEVERITY } from '@/components/technadzor/Badge';
import { toLocalYmd } from '@/lib/utils';

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

const DEFECT_TYPE_LABEL: Record<string, string> = {
  quality: 'Качество', safety: 'Безопасность', compliance: 'Соответствие',
  critical: 'Критический', major: 'Существенный', minor: 'Незначительный',
  structural: 'Конструктивный', finishing: 'Отделочный', engineering: 'Инженерный',
  cosmetic: 'Косметический', functional: 'Функциональный',
};
const defectTypeLabel = (v?: string) => {
  if (!v) return '—';
  return DEFECT_TYPE_LABEL[v] ?? (v.charAt(0).toUpperCase() + v.slice(1));
};

interface UserInfo { name: string; phone?: string; email?: string; roleName?: string; avatarUrl?: string }
interface CommentAttachment { url: string; name?: string; mimeType?: string; kind?: 'image' | 'audio' | 'video' | 'file'; size?: number }
interface CommentItem { id: number; userName?: string; commentText: string; createdAt?: string; attachments?: CommentAttachment[] }

const fmtDateTime = (v?: string) => {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

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

function AssigneeRow({ label, u, t }: { label: string; u?: UserInfo; t: (s: string) => string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">{t(label)}</div>
      {u ? (
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-xs font-semibold text-gray-500 shrink-0">
            {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : (u.name[0] ?? '?')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-gray-800 dark:text-gray-100 truncate">{u.name}</div>
            <div className="text-xs text-gray-400 truncate">{u.roleName || ''}{u.phone ? ` · ${u.phone}` : ''}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <a href="/dashboard/chat" title={t('Чат')} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:text-violet-500">💬</a>
            {u.phone && <a href={`tel:${u.phone}`} title={t('Позвонить')} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:text-violet-500">📞</a>}
            {u.email && <a href={`mailto:${u.email}`} title={t('Написать')} className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:text-violet-500">✉️</a>}
          </div>
        </div>
      ) : <div className="text-sm text-gray-400">—</div>}
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
  const [users, setUsers] = useState<Record<number, UserInfo>>({});
  const [activePhoto, setActivePhoto] = useState(0);
  const [source, setSource] = useState<{ code?: string; name?: string } | null>(null);
  const [tab, setTab] = useState<'desc' | 'media' | 'links' | 'history' | 'comments'>('desc');
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [pendingFiles, setPendingFiles] = useState<CommentAttachment[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const authUser = useAuthStore((s) => s.user);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Defect>(`/defects/${id}`);
      setDefect(data);
      // «Источник» — привязанный пункт контроля (если есть)
      const cpId = (data as any).controlPointId;
      if (cpId) {
        api.get(`/control-points/${cpId}`).then(({ data: cp }) => setSource({ code: cp.code, name: cp.name })).catch(() => {});
      }
    } catch {
      setDefect(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadComments = useCallback(async () => {
    try {
      const { data } = await api.get(`/defects/${id}/comments`);
      setComments(Array.isArray(data) ? data : (data?.data ?? []));
    } catch { /* пусто */ }
  }, [id]);

  useEffect(() => { load(); loadComments(); }, [load, loadComments]);

  const uploadCommentFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    try {
      const { data } = await api.post('/inspections/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const arr: CommentAttachment[] = (Array.isArray(data) ? data : []).map((x: any) => ({
        url: x.fileUrl, name: x.fileName, mimeType: x.mimeType, size: x.fileSize,
        kind: x.mimeType?.startsWith('image/') ? 'image' : x.mimeType?.startsWith('audio/') ? 'audio' : x.mimeType?.startsWith('video/') ? 'video' : 'file',
      }));
      setPendingFiles((p) => [...p, ...arr]);
    } catch { addToast('error', 'Не удалось загрузить файл'); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('files', new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' }));
        try {
          const { data } = await api.post('/inspections/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          const x = Array.isArray(data) ? data[0] : null;
          if (x?.fileUrl) setPendingFiles((p) => [...p, { url: x.fileUrl, name: 'Голосовое сообщение', mimeType: 'audio/webm', kind: 'audio' }]);
        } catch { addToast('error', 'Не удалось сохранить запись'); }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch { addToast('error', 'Нет доступа к микрофону'); }
  };
  const stopRecording = () => { recorderRef.current?.stop(); setRecording(false); };

  const sendComment = async () => {
    const text = newComment.trim();
    if (!text && pendingFiles.length === 0) return;
    setSendingComment(true);
    try {
      await api.post(`/defects/${id}/comments`, {
        commentText: text,
        userName: authUser?.name || undefined,
        attachments: pendingFiles,
      });
      setNewComment('');
      setPendingFiles([]);
      loadComments();
    } catch {
      addToast('error', 'Не удалось отправить комментарий');
    } finally {
      setSendingComment(false);
    }
  };

  useEffect(() => {
    api.get('/users', { params: { limit: 200 } }).then(({ data }) => {
      const list: any[] = data?.data || data?.users || (Array.isArray(data) ? data : []);
      const map: Record<number, UserInfo> = {};
      for (const u of list) {
        map[u.id] = {
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email || `#${u.id}`,
          phone: u.phone,
          email: u.email,
          roleName: u.role?.name || u.roleName,
          avatarUrl: u.avatarUrl || u.avatar_url,
        };
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

  const today = () => toLocalYmd();

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

  // История строится из дат самого дефекта (без отдельной таблицы)
  const timeline: Array<{ label: string; date?: string; who?: string }> = [
    { label: 'Дефект создан', date: defect.reportedDate || defect.createdAt, who: defect.reportedByUserId ? users[defect.reportedByUserId]?.name : undefined },
    ...(defect.assignedToUserId ? [{ label: 'Назначен исполнитель', date: defect.createdAt, who: users[defect.assignedToUserId]?.name }] : []),
    ...(defect.fixedDate ? [{ label: 'Отмечен устранённым', date: defect.fixedDate }] : []),
    ...(defect.verifiedDate ? [{ label: 'Проверен', date: defect.verifiedDate, who: defect.verifiedByUserId ? users[defect.verifiedByUserId]?.name : undefined }] : []),
    ...((defect.status ?? 0) === 5 ? [{ label: 'Дефект закрыт', date: defect.updatedAt }] : []),
  ].filter((e) => e.date);

  // SLA по плановому сроку устранения
  const slaDays = defect.dueDate && defect.reportedDate
    ? Math.round((new Date(defect.dueDate).getTime() - new Date(defect.reportedDate).getTime()) / 86400000)
    : undefined;
  const daysLeft = defect.dueDate && (defect.status ?? 0) < 3
    ? Math.ceil((new Date(defect.dueDate).getTime() - Date.now()) / 86400000)
    : undefined;

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
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
            {defect.locationDescription && <span>📍 {defect.locationDescription}</span>}
            {defect.category && <Badge label={defect.category} color="violet" />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Мета (всегда видна) */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="ID дефекта">
              <button onClick={() => { navigator.clipboard?.writeText(defect.defectNumber || `DEF-${defect.id}`); addToast('success', 'Скопировано'); }} className="inline-flex items-center gap-1 hover:text-violet-500">
                {defect.defectNumber || `DEF-${defect.id}`}
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></svg>
              </button>
            </Field>
            <Field label="Критичность">{sev ? <Badge label={t(sev.label)} color={sev.color} /> : '—'}</Field>
            <Field label="Тип дефекта">{defectTypeLabel(defect.defectType)}</Field>
            <Field label="Создан">
              <div>{fmtDate(defect.createdAt)}</div>
              {defect.reportedByUserId && <div className="text-xs text-gray-400">{users[defect.reportedByUserId]?.name}</div>}
            </Field>
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
            <Field label="Категория">{defect.category || '—'}</Field>
            <Field label="Источник">
              {source ? <Link href={`/dashboard/technadzor/control-points/new?id=${(defect as any).controlPointId}`} className="text-violet-600 dark:text-violet-400 hover:underline">{[source.code, source.name].filter(Boolean).join(' ')}</Link> : '—'}
            </Field>
            <Field label="Обновлён">{fmtDate(defect.updatedAt)}</Field>
          </div>

          {/* Вкладки */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-xs overflow-hidden">
            <div className="flex border-b border-gray-100 dark:border-gray-700 px-2">
              {([
                { k: 'desc', label: 'Описание' },
                { k: 'media', label: `Фото и файлы (${photos.length + docs.length})` },
                { k: 'links', label: 'Связи' },
                { k: 'comments', label: `Комментарии (${comments.length})` },
                { k: 'history', label: 'История' },
              ] as const).map((it) => (
                <button
                  key={it.k}
                  onClick={() => setTab(it.k)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${
                    tab === it.k
                      ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {t(it.label)}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === 'desc' && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{defect.description || t('Описание не указано')}</p>
                  {defect.correctionDescription && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('Описание устранения')}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{defect.correctionDescription}</p>
                    </div>
                  )}
                </div>
              )}

              {tab === 'media' && (
                <div className="space-y-5">
                  {photos.length > 0 ? (
                    <div>
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
                  ) : <p className="text-sm text-gray-400">{t('Фото не прикреплены')}</p>}
                  {docs.length > 0 && (
                    <ul className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
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
                  )}
                </div>
              )}

              {tab === 'links' && (
                <div className="space-y-2 text-sm">
                  {defect.inspectionId ? (
                    <Link href={`/dashboard/technadzor/inspections/${defect.inspectionId}`} className="block text-violet-600 dark:text-violet-400 hover:underline">🔍 {t('Инспекция')} #{defect.inspectionId}</Link>
                  ) : <p className="text-gray-400">{t('Инспекция не привязана')}</p>}
                  {defect.taskId ? (
                    <Link href={`/dashboard/tasks?id=${defect.taskId}`} className="block text-violet-600 dark:text-violet-400 hover:underline">✅ {t('Задача')} #{defect.taskId}</Link>
                  ) : <p className="text-gray-400">{t('Задача не создана')}</p>}
                  {defect.projectId ? <p className="text-gray-500 dark:text-gray-400">🏢 {t('Проект')} #{defect.projectId}</p> : null}
                  {defect.constructionSiteId ? <p className="text-gray-500 dark:text-gray-400">📍 {t('Объект')} #{defect.constructionSiteId}</p> : null}
                </div>
              )}

              {tab === 'comments' && (
                <div>
                  <ul className="space-y-3 mb-4">
                    {comments.length === 0 && <p className="text-sm text-gray-400">{t('Комментариев пока нет')}</p>}
                    {comments.map((c) => (
                      <li key={c.id} className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{c.userName || t('Пользователь')}</span>
                          <span className="text-xs text-gray-400">{fmtDateTime(c.createdAt)}</span>
                        </div>
                        {c.commentText && <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{c.commentText}</p>}
                        {(c.attachments ?? []).length > 0 && (
                          <div className="mt-2 space-y-2">
                            {(c.attachments ?? []).map((a, i) => (
                              <CommentAttachmentView key={i} a={a} />
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* Превью прикреплённого до отправки */}
                  {pendingFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {pendingFiles.map((a, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs rounded-lg bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 px-2 py-1">
                          {a.kind === 'image' ? '🖼' : a.kind === 'audio' ? '🎤' : a.kind === 'video' ? '🎬' : '📎'} {a.name || 'файл'}
                          <button onClick={() => setPendingFiles((p) => p.filter((_, j) => j !== i))} className="hover:text-red-500">×</button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setAttachOpen((o) => !o)}
                        title={t('Прикрепить')}
                        className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-400 hover:text-violet-500"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" /></svg>
                      </button>
                      {attachOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setAttachOpen(false)} />
                          <div className="absolute bottom-11 left-0 z-20 w-52 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg py-1">
                            {([
                              { icon: '🖼', label: 'Прикрепить фото', accept: 'image/*' },
                              { icon: '📷', label: 'Сделать фото', accept: 'image/*', capture: 'environment' },
                              { icon: '🎬', label: 'Снять видео', accept: 'video/*', capture: 'environment' },
                              { icon: '📹', label: 'Прикрепить видео', accept: 'video/*' },
                              { icon: '📎', label: 'Прикрепить файл', accept: '' },
                            ] as const).map((opt, i) => (
                              <label key={i} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                                <span>{opt.icon}</span>{t(opt.label)}
                                <input
                                  type="file"
                                  multiple
                                  accept={opt.accept || undefined}
                                  {...(('capture' in opt && opt.capture) ? { capture: opt.capture } : {})}
                                  className="hidden"
                                  onChange={(e) => { uploadCommentFiles(e.target.files); e.currentTarget.value = ''; setAttachOpen(false); }}
                                />
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      onClick={recording ? stopRecording : startRecording}
                      title={recording ? t('Остановить запись') : t('Голосовое сообщение')}
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${recording ? 'border-red-400 text-red-500 animate-pulse' : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:text-violet-500'}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" /></svg>
                    </button>
                    <input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                      placeholder={recording ? t('Идёт запись…') : t('Написать комментарий…')}
                      className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100"
                    />
                    <button onClick={sendComment} disabled={sendingComment || (!newComment.trim() && pendingFiles.length === 0)} className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 shrink-0">{t('Отправить')}</button>
                  </div>
                </div>
              )}

              {tab === 'history' && (
                <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-2 space-y-4">
                  {timeline.length === 0 && <p className="text-sm text-gray-400 ml-4">{t('Нет событий')}</p>}
                  {timeline.map((e, i) => (
                    <li key={i} className="ml-4">
                      <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-violet-500" />
                      <div className="text-sm text-gray-800 dark:text-gray-100">{t(e.label)}</div>
                      <div className="text-xs text-gray-400">{fmtDate(e.date)}{e.who ? ` · ${e.who}` : ''}</div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('Назначение')}</h3>
            <AssigneeRow label="Ответственный" u={defect.assignedToUserId ? users[defect.assignedToUserId] : undefined} t={t} />
            <AssigneeRow label="Кто выявил" u={defect.reportedByUserId ? users[defect.reportedByUserId] : undefined} t={t} />
            <AssigneeRow label="Проверил" u={defect.verifiedByUserId ? users[defect.verifiedByUserId] : undefined} t={t} />
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('Сроки и контроль')}</h3>
              {slaDays != null && <span className="text-xs px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300">SLA: {slaDays} {t('дн.')}</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Плановый срок"><span className={overdue ? 'text-red-500 font-medium' : ''}>{fmtDate(defect.dueDate)}</span></Field>
              <Field label="Фактический срок">{fmtDate(defect.fixedDate)}</Field>
            </div>
            <div className="mt-3">
              <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">{t('Осталось')}</div>
              {overdue ? (
                <span className="text-sm text-red-500 font-medium">{t('Просрочено на')} {Math.abs(daysLeft ?? 0)} {t('дн.')}</span>
              ) : daysLeft != null ? (
                <span className="text-sm text-gray-700 dark:text-gray-200">{daysLeft} {t('дн.')}</span>
              ) : <span className="text-sm text-gray-400">—</span>}
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

          {/* История изменений (компактная) */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('История изменений')}</h3>
            <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-1 space-y-3">
              {timeline.length === 0 && <p className="text-sm text-gray-400 ml-3">{t('Нет событий')}</p>}
              {timeline.map((e, i) => (
                <li key={i} className="ml-3">
                  <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-violet-500" />
                  <div className="text-sm text-gray-800 dark:text-gray-100">{t(e.label)}</div>
                  <div className="text-xs text-gray-400">{fmtDate(e.date)}{e.who ? ` · ${e.who}` : ''}</div>
                </li>
              ))}
            </ol>
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

function CommentAttachmentView({ a }: { a: CommentAttachment }) {
  if (a.kind === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <a href={a.url} target="_blank" rel="noreferrer"><img src={a.url} alt={a.name || ''} className="max-w-[200px] max-h-40 rounded-lg object-cover" /></a>;
  }
  if (a.kind === 'audio') {
    return <audio controls src={a.url} className="w-full max-w-[260px] h-9" />;
  }
  if (a.kind === 'video') {
    return <video controls src={a.url} className="max-w-[260px] max-h-48 rounded-lg" />;
  }
  return (
    <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 hover:underline">
      📎 {a.name || a.url.split('/').pop()}
    </a>
  );
}
