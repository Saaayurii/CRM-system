'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface DocumentFormModalProps {
  document?: any | null;
  onClose: () => void;
  onSaved: () => void;
}

interface Project {
  id: number;
  name: string;
}

const DOCUMENT_TYPES = [
  { value: 'contract', label: 'Договор' },
  { value: 'act', label: 'Акт' },
  { value: 'invoice', label: 'Счёт' },
  { value: 'report', label: 'Отчёт' },
  { value: 'permit', label: 'Разрешение' },
  { value: 'blueprint', label: 'Чертёж' },
  { value: 'specification', label: 'Спецификация' },
  { value: 'protocol', label: 'Протокол' },
  { value: 'certificate', label: 'Сертификат' },
  { value: 'other', label: 'Другое' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Черновик' },
  { value: 'pending', label: 'На рассмотрении' },
  { value: 'approved', label: 'Утверждён' },
  { value: 'rejected', label: 'Отклонён' },
  { value: 'archived', label: 'В архиве' },
];

const ACCESS_LEVELS = [
  { value: 'public', label: 'Публичный' },
  { value: 'internal', label: 'Внутренний' },
  { value: 'confidential', label: 'Конфиденциальный' },
  { value: 'restricted', label: 'Ограниченный' },
];

export default function DocumentFormModal({ document, onClose, onSaved }: DocumentFormModalProps) {
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [formData, setFormData] = useState({
    title: document?.title || '',
    documentType: document?.documentType || document?.document_type || 'other',
    documentNumber: document?.documentNumber || document?.document_number || '',
    description: document?.description || '',
    projectId: document?.projectId || document?.project_id || '',
    version: document?.version || '1.0',
    fileUrl: document?.fileUrl || document?.file_url || '',
    fileSize: document?.fileSize || document?.file_size || '',
    fileType: document?.fileType || document?.file_type || '',
    issueDate: document?.issueDate?.split('T')[0] || document?.issue_date?.split('T')[0] || '',
    expiryDate: document?.expiryDate?.split('T')[0] || document?.expiry_date?.split('T')[0] || '',
    status: document?.status || 'draft',
    accessLevel: document?.accessLevel || document?.access_level || 'internal',
    tags: document?.tags ? (Array.isArray(document.tags) ? document.tags.join(', ') : '') : '',
  });

  useEffect(() => {
    api.get('/projects', { params: { limit: 100 } })
      .then(({ data }) => {
        setProjects(data.projects || data.data || []);
      })
      .catch(() => {});
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // В реальном приложении здесь должна быть загрузка файла на сервер
    // Пока просто заполняем метаданные
    setUploadingFile(true);

    // Симуляция загрузки файла
    setTimeout(() => {
      handleChange('fileSize', file.size);
      handleChange('fileType', file.type);
      // В реальности здесь будет URL загруженного файла
      handleChange('fileUrl', `https://example.com/uploads/${file.name}`);
      setUploadingFile(false);
      addToast('info', 'Функция загрузки файлов будет добавлена позже. Введите URL вручную.');
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      addToast('error', 'Введите название документа');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        title: formData.title,
        documentType: formData.documentType,
        documentNumber: formData.documentNumber || null,
        description: formData.description || null,
        projectId: formData.projectId ? Number(formData.projectId) : null,
        version: formData.version || null,
        fileUrl: formData.fileUrl || null,
        fileSize: formData.fileSize ? Number(formData.fileSize) : null,
        fileType: formData.fileType || null,
        issueDate: formData.issueDate || null,
        expiryDate: formData.expiryDate || null,
        status: formData.status,
        accessLevel: formData.accessLevel,
        tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
      };

      if (document?.id) {
        await api.put(`/documents/${document.id}`, payload);
        addToast('success', 'Документ обновлён');
      } else {
        await api.post('/documents', payload);
        addToast('success', 'Документ создан');
      }

      onSaved();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            {document ? 'Редактировать документ' : 'Новый документ'}
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
              placeholder="Название документа"
              required
            />
          </div>

          {/* Type & Document Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Тип документа
              </label>
              <select
                value={formData.documentType}
                onChange={(e) => handleChange('documentType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                {DOCUMENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Номер документа
              </label>
              <input
                type="text"
                value={formData.documentNumber}
                onChange={(e) => handleChange('documentNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="№ 123/45"
              />
            </div>
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
              placeholder="Описание документа"
            />
          </div>

          {/* Project & Version */}
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
                Версия
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => handleChange('version', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="1.0"
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Файл
            </label>
            <div className="flex gap-2">
              <input
                type="file"
                onChange={handleFileSelect}
                disabled={uploadingFile}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 dark:file:bg-violet-500/20 dark:file:text-violet-300"
              />
            </div>
            <input
              type="url"
              value={formData.fileUrl}
              onChange={(e) => handleChange('fileUrl', e.target.value)}
              placeholder="или введите URL файла"
              className="w-full px-3 py-2 mt-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Дата выдачи
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => handleChange('issueDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Дата истечения
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => handleChange('expiryDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status & Access Level */}
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
                Уровень доступа
              </label>
              <select
                value={formData.accessLevel}
                onChange={(e) => handleChange('accessLevel', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                {ACCESS_LEVELS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Теги
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="строительство, договор, важное (через запятую)"
            />
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
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {loading ? 'Сохранение...' : document ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
