'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface ObjectSite {
  id: number;
  name: string;
  code?: string;
  siteType?: string;
  address?: string;
  description?: string;
  status?: number;
  foremanId?: number;
  startDate?: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  areaSize?: number;
  projectId?: number;
  createdAt?: string;
  photos?: string[];
}

interface Project {
  id: number;
  name: string;
  code?: string;
}

interface Task {
  id: number;
  title: string;
  status: number;
  priority: number;
  dueDate?: string;
  assignees?: { id: number; userId: number; userName?: string }[];
}

interface Document {
  id: number;
  title: string;
  documentType?: string;
  status?: string;
  fileUrl?: string;
  createdAt?: string;
}

const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Планирование', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  1: { label: 'В работе', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  2: { label: 'Приостановлен', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  3: { label: 'Завершён', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
};

const TASK_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: 'Новая', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  1: { label: 'В работе', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  2: { label: 'На проверке', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  3: { label: 'Завершена', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  4: { label: 'Отменена', color: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' },
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Низкий', color: 'text-gray-500' },
  1: { label: 'Средний', color: 'text-yellow-500' },
  2: { label: 'Высокий', color: 'text-orange-500' },
  3: { label: 'Критический', color: 'text-red-500' },
};

type TabKey = 'overview' | 'tasks' | 'documents' | 'media';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Обзор' },
  { key: 'tasks', label: 'Задачи' },
  { key: 'documents', label: 'Документы' },
  { key: 'media', label: 'Медиа' },
];

function isImage(url: string) {
  return /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(url);
}

export default function ObjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  const projectId = Number(params.id);
  const objectId = Number(params.objectId);

  const [project, setProject] = useState<Project | null>(null);
  const [obj, setObj] = useState<ObjectSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  const [docs, setDocs] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsLoaded, setDocsLoaded] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editStatus, setEditStatus] = useState(0);
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editPlannedEnd, setEditPlannedEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, siteRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/construction-sites/${objectId}`),
      ]);
      setProject(projRes.data);
      const site = siteRes.data;
      setObj(site);
      setEditName(site.name ?? '');
      setEditAddress(site.address ?? '');
      setEditCode(site.code ?? '');
      setEditStatus(typeof site.status === 'number' ? site.status : parseInt(site.status) || 0);
      setEditDescription(site.description ?? '');
      setEditStartDate(site.startDate?.slice(0, 10) ?? '');
      setEditPlannedEnd(site.plannedEndDate?.slice(0, 10) ?? '');
    } catch {
      addToast('error', 'Не удалось загрузить объект');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [projectId, objectId, addToast, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (activeTab === 'tasks' && !tasksLoaded && !tasksLoading) {
      setTasksLoading(true);
      api.get('/tasks', { params: { constructionSiteId: objectId, limit: 200 } })
        .then((r) => {
          const arr = r.data?.tasks || r.data?.data || r.data || [];
          setTasks(Array.isArray(arr) ? arr : []);
          setTasksLoaded(true);
        })
        .catch(() => setTasks([]))
        .finally(() => setTasksLoading(false));
    }
  }, [activeTab, tasksLoaded, tasksLoading, objectId]);

  useEffect(() => {
    if (activeTab === 'documents' && !docsLoaded && !docsLoading) {
      setDocsLoading(true);
      api.get('/documents', { params: { constructionSiteId: objectId, limit: 200 } })
        .then((r) => {
          const arr = r.data?.data || r.data?.documents || r.data || [];
          setDocs(Array.isArray(arr) ? arr : []);
          setDocsLoaded(true);
        })
        .catch(() => setDocs([]))
        .finally(() => setDocsLoading(false));
    }
  }, [activeTab, docsLoaded, docsLoading, objectId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/construction-sites/${objectId}`, {
        name: editName,
        address: editAddress,
        code: editCode || undefined,
        status: editStatus,
        description: editDescription || undefined,
        startDate: editStartDate || undefined,
        plannedEndDate: editPlannedEnd || undefined,
      });
      const updated = res.data ?? { ...obj, name: editName, address: editAddress };
      setObj(updated);
      setEditing(false);
      addToast('success', 'Объект обновлён');
    } catch {
      addToast('error', 'Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (!obj) return null;

  const statusInfo = STATUS_LABELS[obj.status ?? 0] ?? STATUS_LABELS[0];
  const photos: string[] = Array.isArray(obj.photos) ? obj.photos : [];

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2 flex-wrap">
            <button onClick={() => router.push('/dashboard/projects')} className="hover:text-violet-500 transition-colors">
              Проекты
            </button>
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            <button onClick={() => router.push(`/dashboard/projects/${projectId}?tab=objects`)} className="hover:text-violet-500 transition-colors truncate max-w-[180px]">
              {project?.code ? `${project.code} | ` : ''}{project?.name ?? `Проект #${projectId}`}
            </button>
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-700 dark:text-gray-200 font-medium truncate max-w-[180px]">{obj.name}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{obj.name}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          {obj.address && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{obj.address}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push(`/dashboard/projects/${projectId}?tab=objects`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Назад
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            {editing ? 'Отмена' : 'Редактировать'}
          </button>
        </div>
      </div>

      {/* ─── Tabs ─── */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1 -mb-px">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Overview ─── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-6">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Основная информация</h3>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Название *</label>
                  <input autoFocus className="form-input w-full" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Адрес *</label>
                  <input className="form-input w-full" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Код</label>
                    <input className="form-input w-full" value={editCode} onChange={(e) => setEditCode(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Статус</label>
                    <select className="form-select w-full" value={editStatus} onChange={(e) => setEditStatus(Number(e.target.value))}>
                      <option value={0}>Планирование</option>
                      <option value={1}>В работе</option>
                      <option value={2}>Приостановлен</option>
                      <option value={3}>Завершён</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Описание</label>
                  <textarea className="form-input w-full resize-y" rows={4} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors">Отмена</button>
                  <button onClick={handleSave} disabled={saving || !editName.trim()} className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            ) : (
              <dl className="space-y-3">
                <Row label="Название" value={obj.name} />
                <Row label="Адрес" value={obj.address ?? '—'} />
                <Row label="Код" value={obj.code ?? '—'} />
                <Row label="Тип" value={obj.siteType ?? '—'} />
                <Row label="Статус" value={
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                } />
                {obj.description && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <dt className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">Описание</dt>
                    <dd className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{obj.description}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-6">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Сроки</h3>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Дата начала</label>
                  <input type="date" className="form-input w-full" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Плановое окончание</label>
                  <input type="date" className="form-input w-full" value={editPlannedEnd} onChange={(e) => setEditPlannedEnd(e.target.value)} />
                </div>
              </div>
            ) : (
              <dl className="space-y-3">
                <Row label="Дата начала" value={obj.startDate ? new Date(obj.startDate).toLocaleDateString('ru-RU') : '—'} />
                <Row label="Плановое окончание" value={obj.plannedEndDate ? new Date(obj.plannedEndDate).toLocaleDateString('ru-RU') : '—'} />
                <Row label="Фактическое окончание" value={obj.actualEndDate ? new Date(obj.actualEndDate).toLocaleDateString('ru-RU') : '—'} />
                {obj.areaSize != null && <Row label="Площадь (м²)" value={String(obj.areaSize)} />}
              </dl>
            )}
          </div>
        </div>
      )}

      {/* ─── Tasks ─── */}
      {activeTab === 'tasks' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Задачи объекта</h2>
          </div>
          {tasksLoading ? (
            <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" /></div>
          ) : tasks.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Задач нет</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                    <th className="py-3 px-4 text-left font-semibold">Задача</th>
                    <th className="py-3 px-4 text-left font-semibold">Статус</th>
                    <th className="py-3 px-4 text-left font-semibold">Приоритет</th>
                    <th className="py-3 px-4 text-left font-semibold">Срок</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                      <td className="py-3 px-4 text-gray-800 dark:text-gray-100 font-medium">{task.title}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TASK_STATUS[task.status]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                          {TASK_STATUS[task.status]?.label ?? task.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium ${PRIORITY_LABELS[task.priority]?.color ?? 'text-gray-500'}`}>
                          {PRIORITY_LABELS[task.priority]?.label ?? '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('ru-RU') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Documents ─── */}
      {activeTab === 'documents' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Документы объекта</h2>
          </div>
          {docsLoading ? (
            <div className="py-12 flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500" /></div>
          ) : docs.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Документов нет</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/20">
                    <th className="py-3 px-4 text-left font-semibold">Название</th>
                    <th className="py-3 px-4 text-left font-semibold">Тип</th>
                    <th className="py-3 px-4 text-left font-semibold">Статус</th>
                    <th className="py-3 px-4 text-left font-semibold">Дата</th>
                    <th className="py-3 px-4 text-left font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {docs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                      <td className="py-3 px-4 text-gray-800 dark:text-gray-100 font-medium">{doc.title}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{doc.documentType ?? '—'}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{doc.status ?? '—'}</td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">
                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('ru-RU') : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {doc.fileUrl && (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="text-violet-500 hover:text-violet-600 text-xs font-medium">
                            Открыть
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Media ─── */}
      {activeTab === 'media' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-6">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Медиа объекта</h2>
          {photos.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Медиафайлов нет</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="block aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 hover:ring-2 hover:ring-violet-400 transition-all">
                  {isImage(url) ? (
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      <span className="text-xs">Видео</span>
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-800 dark:text-gray-100 text-right">{value}</dd>
    </div>
  );
}
