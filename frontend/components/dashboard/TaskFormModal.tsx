'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useOfflineForm } from '@/hooks/useOfflineForm';
import { useDraft } from '@/hooks/useDraft';
import DraftBanner from '@/components/ui/DraftBanner';
import FilePreviewModal from '@/components/ui/FilePreviewModal';

interface TaskAttachment {
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
}

interface TaskFormModalProps {
  task?: any | null;
  onClose: () => void;
  onSaved: () => void;
}

interface Project {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

const STATUS_OPTIONS = [
  { value: 0, label: 'Новая' },
  { value: 1, label: 'Назначена' },
  { value: 2, label: 'В работе' },
  { value: 3, label: 'На проверке' },
  { value: 4, label: 'Завершена' },
  { value: 5, label: 'Отменена' },
];

const PRIORITY_OPTIONS = [
  { value: 1, label: 'Низкий' },
  { value: 2, label: 'Средний' },
  { value: 3, label: 'Высокий' },
  { value: 4, label: 'Критический' },
];

export default function TaskFormModal({ task, onClose, onSaved }: TaskFormModalProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<TaskAttachment[]>(() => {
    const raw = task?.attachments;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
  });
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { submit: submitCreate, isPending: isCreating } = useOfflineForm({
    method: 'POST',
    path: '/api/v1/tasks',
    entityType: 'task',
  });

  const { submit: submitUpdate, isPending: isUpdating } = useOfflineForm({
    method: 'PUT',
    path: task?.id ? `/api/v1/tasks/${task.id}` : '/api/v1/tasks',
    entityType: 'task',
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const isNew = !task?.id;
  const initialForm = {
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status ?? 0,
    priority: task?.priority ?? 2,
    projectId: task?.projectId || task?.project_id || '',
    assignedToUserId: task?.assignedToUserId || task?.assigned_to_user_id || '',
    dueDate: task?.dueDate?.split('T')[0] || task?.due_date?.split('T')[0] || '',
    estimatedHours: task?.estimatedHours || task?.estimated_hours || '',
  };
  const draft = useDraft('task:new', initialForm);
  const [formData, setFormDataRaw] = useState(initialForm);

  const setFormData = (updater: any) => {
    const next = typeof updater === 'function' ? updater(formData) : updater;
    setFormDataRaw(next);
    if (isNew) draft.set(next);
  };

  useEffect(() => {
    Promise.all([
      api.get('/projects', { params: { limit: 100 } }),
      api.get('/users', { params: { limit: 100 } }),
    ])
      .then(([projectsRes, usersRes]) => {
        setProjects(projectsRes.data.projects || projectsRes.data.data || []);
        setUsers(usersRes.data.data || usersRes.data.users || []);
      })
      .catch(() => {});
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: typeof initialForm) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const browserSizes = Array.from(files).map((f) => f.size);
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append('files', f));
      const { data } = await api.post('/chat-channels/upload', formData);
      const rawList: any[] = Array.isArray(data) ? data : [data];
      const uploaded: TaskAttachment[] = rawList.map((att, i) => ({
        ...att,
        fileSize: att.fileSize || browserSizes[i] || 0,
      }));
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch {
      addToast('error', 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      addToast('error', 'Введите название задачи');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title: formData.title,
        description: formData.description || null,
        status: Number(formData.status),
        priority: Number(formData.priority),
        projectId: formData.projectId ? Number(formData.projectId) : null,
        assignedToUserId: formData.assignedToUserId ? Number(formData.assignedToUserId) : null,
        dueDate: formData.dueDate || null,
        estimatedHours: formData.estimatedHours ? Number(formData.estimatedHours) : null,
        attachments,
      };

      const label = `Задача «${formData.title}»`;
      if (task?.id) {
        const result = await submitUpdate(payload, label);
        if (result.ok && !result.queued) addToast('success', 'Задача обновлена');
        if (result.ok) onSaved();
      } else {
        const result = await submitCreate(payload, label);
        if (result.ok && !result.queued) addToast('success', 'Задача создана');
        if (result.ok) { draft.clearDraft(); onSaved(); }
      }
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {task ? 'Редактировать задачу' : 'Новая задача'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {isNew && draft.hasDraft && (
          <DraftBanner
            onRestore={() => { const d = draft.restoreDraft(); if (d) setFormDataRaw(d); }}
            onDiscard={() => draft.clearDraft()}
          />
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Название <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Название задачи"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Описание задачи"
            />
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Статус
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Приоритет
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Project & Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Проект
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => handleChange('projectId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Не выбрано</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Исполнитель
              </label>
              <select
                value={formData.assignedToUserId}
                onChange={(e) => handleChange('assignedToUserId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Не назначено</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date & Estimated Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Срок выполнения
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Оценка (часы)
              </label>
              <input
                type="number"
                value={formData.estimatedHours}
                onChange={(e) => handleChange('estimatedHours', e.target.value)}
                min="0"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Вложения
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            {/* Uploaded files list */}
            {attachments.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {attachments.map((att, i) => {
                  const isImage = att.mimeType?.startsWith('image/');
                  const isVideo = att.mimeType?.startsWith('video/');
                  const attFileUrl = att.fileUrl || (att as any).url || (att as any).file_url || '';
                  return (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                      {isImage ? (
                        <img src={attFileUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0">
                          {isVideo ? (
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                          )}
                        </div>
                      )}
                      <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{att.fileName}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {(() => {
                          const s = Number(att.fileSize) || 0;
                          if (!s) return '—';
                          return s < 1024 * 1024
                            ? `${(s / 1024).toFixed(0)} КБ`
                            : `${(s / (1024 * 1024)).toFixed(1)} МБ`;
                        })()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewFile({ url: attFileUrl, name: att.fileName })}
                        className="shrink-0 p-1 text-gray-400 hover:text-violet-500 transition-colors"
                        title="Просмотр"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                        className="shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Удалить"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors w-full justify-center disabled:opacity-50"
            >
              {uploading ? (
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                </svg>
              )}
              {uploading ? 'Загрузка...' : 'Прикрепить файлы'}
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || isCreating || isUpdating}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {loading || isCreating || isUpdating ? 'Сохранение...' : task ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>

      {previewFile && (
        <FilePreviewModal
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
