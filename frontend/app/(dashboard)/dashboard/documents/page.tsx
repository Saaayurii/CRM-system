'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import DocumentFormModal from '@/components/dashboard/DocumentFormModal';

interface Document {
  id: number;
  title: string;
  description?: string;
  documentType?: string;
  document_type?: string;
  documentNumber?: string;
  document_number?: string;
  status?: string;
  fileUrl?: string;
  file_url?: string;
  projectId?: number;
  project_id?: number;
  version?: string;
  fileSize?: number;
  file_size?: number;
  fileType?: string;
  file_type?: string;
  issueDate?: string;
  issue_date?: string;
  expiryDate?: string;
  expiry_date?: string;
  accessLevel?: string;
  access_level?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

interface Project {
  id: number;
  name: string;
}

const typeLabels: Record<string, string> = {
  contract: 'Договор',
  act: 'Акт',
  invoice: 'Счёт',
  report: 'Отчёт',
  permit: 'Разрешение',
  blueprint: 'Чертёж',
  specification: 'Спецификация',
  other: 'Другое',
};

const typeIcons: Record<string, string> = {
  contract: '\uD83D\uDCC4',
  act: '\uD83D\uDCCB',
  invoice: '\uD83D\uDCB3',
  report: '\uD83D\uDCCA',
  permit: '\u2705',
  blueprint: '\uD83D\uDCD0',
  specification: '\uD83D\uDCD1',
  other: '\uD83D\uDCC1',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-600/30 dark:text-gray-400',
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  archived: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
};

const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  pending: 'На рассмотрении',
  approved: 'Утверждён',
  rejected: 'Отклонён',
  archived: 'В архиве',
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export default function DocumentsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const limit = 20;

  useEffect(() => {
    api.get('/projects', { params: { limit: 100 } })
      .then(({ data }) => setProjects(data.projects || data.data || []))
      .catch(() => {});
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit };
      if (typeFilter) params.documentType = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      if (projectFilter) params.projectId = projectFilter;

      const { data } = await api.get('/documents', { params });
      setDocuments(data.data || data.documents || []);
      setTotal(data.total || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, typeFilter, statusFilter, search, projectFilter]);

  const handleCreate = () => {
    setEditingDoc(null);
    setShowFormModal(true);
  };

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc);
    setShowFormModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить документ?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/documents/${id}`);
      addToast('success', 'Документ удалён');
      await fetchDocuments();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Ошибка при удалении');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = async () => {
    setShowFormModal(false);
    setEditingDoc(null);
    await fetchDocuments();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="sm:flex sm:justify-between sm:items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
            Документы
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Управление документами и файлами
          </p>
        </div>
        <div className="flex items-center gap-3 mt-3 sm:mt-0">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''} transition-colors`}
              title="Таблица"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''} transition-colors`}
              title="Сетка"
            >
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Загрузить документ
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Поиск по названию..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">Все типы</option>
            {Object.entries(typeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">Все статусы</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={projectFilter}
            onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="">Все проекты</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Документы не найдены</div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3">Название</th>
                  <th className="px-4 py-3">Тип</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Дата создания</th>
                  <th className="px-4 py-3 text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{typeIcons[doc.documentType || ''] || typeIcons.other}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{doc.title}</p>
                          {doc.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{doc.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {typeLabels[doc.documentType || ''] || doc.documentType || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[doc.status || ''] || statusColors.draft}`}>
                        {statusLabels[doc.status || ''] || doc.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(doc.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="text-violet-500 hover:text-violet-600 text-xs font-medium"
                          title="Просмотр"
                        >
                          Просмотр
                        </button>
                        <button
                          onClick={() => handleEdit(doc)}
                          className="text-sky-500 hover:text-sky-600 text-xs font-medium"
                          title="Редактировать"
                        >
                          Изменить
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                          className="text-red-500 hover:text-red-600 disabled:opacity-50 text-xs font-medium"
                          title="Удалить"
                        >
                          {deletingId === doc.id ? '...' : 'Удалить'}
                        </button>
                        {doc.fileUrl && (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-500 hover:text-green-600 text-xs font-medium"
                            title="Скачать"
                          >
                            Скачать
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{typeIcons[doc.documentType || ''] || typeIcons.other}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">{doc.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{typeLabels[doc.documentType || ''] || doc.documentType || 'Документ'}</p>
                  </div>
                </div>

                {doc.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{doc.description}</p>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[doc.status || ''] || statusColors.draft}`}>
                    {statusLabels[doc.status || ''] || doc.status || '—'}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(doc.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => setPreviewDoc(doc)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded transition-colors"
                  >
                    Просмотр
                  </button>
                  <button
                    onClick={() => handleEdit(doc)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded transition-colors"
                  >
                    Изменить
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700/50">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Показано {(page - 1) * limit + 1}–{Math.min(page * limit, total)} из {total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Назад
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Далее
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setPreviewDoc(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPreviewDoc(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{typeIcons[previewDoc.documentType || ''] || typeIcons.other}</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{previewDoc.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {typeLabels[previewDoc.documentType || ''] || previewDoc.documentType || 'Документ'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {previewDoc.description && (
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-1">Описание</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{previewDoc.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-1">Статус</p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${statusColors[previewDoc.status || ''] || statusColors.draft}`}>
                    {statusLabels[previewDoc.status || ''] || previewDoc.status || '—'}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-1">Версия</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{previewDoc.version || '1.0'}</p>
                </div>
                {(previewDoc.documentNumber || (previewDoc as any).document_number) && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-1">Номер</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{previewDoc.documentNumber || (previewDoc as any).document_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-1">Размер файла</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{formatFileSize(previewDoc.fileSize)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-1">Дата создания</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{new Date(previewDoc.createdAt).toLocaleDateString('ru-RU')}</p>
                </div>
                {previewDoc.updatedAt && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-1">Обновлено</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{new Date(previewDoc.updatedAt).toLocaleDateString('ru-RU')}</p>
                  </div>
                )}
              </div>

              {((previewDoc as any).issue_date || (previewDoc as any).issueDate || (previewDoc as any).expiry_date || (previewDoc as any).expiryDate) && (
                <div className="grid grid-cols-2 gap-4">
                  {((previewDoc as any).issue_date || (previewDoc as any).issueDate) && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-1">Дата выдачи</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {new Date((previewDoc as any).issue_date || (previewDoc as any).issueDate).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  )}
                  {((previewDoc as any).expiry_date || (previewDoc as any).expiryDate) && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-1">Истекает</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {new Date((previewDoc as any).expiry_date || (previewDoc as any).expiryDate).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(previewDoc as any).tags && Array.isArray((previewDoc as any).tags) && (previewDoc as any).tags.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-2">Теги</p>
                  <div className="flex flex-wrap gap-1">
                    {(previewDoc as any).tags.map((tag: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              {previewDoc.fileUrl && (
                <a
                  href={previewDoc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Скачать файл
                </a>
              )}
              <button
                onClick={() => {
                  setPreviewDoc(null);
                  handleEdit(previewDoc);
                }}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Редактировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <DocumentFormModal
          document={editingDoc}
          onClose={() => {
            setShowFormModal(false);
            setEditingDoc(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
