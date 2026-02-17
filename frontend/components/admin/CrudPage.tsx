'use client';

import { useState } from 'react';
import type { CrudModuleConfig } from '@/types/admin';
import { useCrudData } from '@/lib/hooks/useCrudData';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import DataTable from './DataTable';
import EntityFormModal from './EntityFormModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import AssignUsersModal from './AssignUsersModal';
import ErrorBoundary from './ErrorBoundary';

interface CrudPageProps {
  config: CrudModuleConfig;
}

interface Assignee {
  userId: number;
  userName?: string;
}

export default function CrudPage({ config }: CrudPageProps) {
  const crud = useCrudData<Record<string, unknown>>({ apiEndpoint: config.apiEndpoint });
  const addToast = useToastStore((s) => s.addToast);
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);
  const [pdfListLoading, setPdfListLoading] = useState(false);

  const handleDownloadListPdf = async () => {
    setPdfListLoading(true);
    try {
      // Step 1: generate PDF, get filename
      const { data: genData } = await api.post('/documents/pdf/generate-list', {
        entityType: config.slug,
        title: config.title,
        rows: crud.data,
      });

      // Step 2: download via axios with auth headers → blob
      const { data: blob } = await api.get(
        `/documents/pdf/download/${genData.filename}`,
        { responseType: 'blob' },
      );

      // Step 3: create object URL and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = genData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addToast('success', 'PDF скачан');
    } catch {
      addToast('error', 'Не удалось сформировать PDF');
    } finally {
      setPdfListLoading(false);
    }
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [deleteItem, setDeleteItem] = useState<Record<string, unknown> | null>(null);

  // Assign users modal state (tasks only)
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTaskId, setAssignTaskId] = useState<number | null>(null);
  const [assignCurrentUsers, setAssignCurrentUsers] = useState<Assignee[]>([]);

  const handleCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (row: Record<string, unknown>) => {
    setEditingItem(row);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    if (editingItem) {
      const ok = await crud.updateItem(editingItem.id as string | number, data);
      if (ok) setFormOpen(false);
    } else {
      const created = await crud.createItem(data);
      if (created) {
        setFormOpen(false);
        // For tasks: auto-open assignees modal after creation
        if (config.slug === 'tasks' && created.id) {
          setAssignTaskId(created.id as number);
          setAssignCurrentUsers([]);
          setAssignOpen(true);
        }
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    const ok = await crud.deleteItem(deleteItem.id as string | number);
    if (ok) setDeleteItem(null);
  };

  const handleCustomAction = async (actionKey: string, row: Record<string, unknown>) => {
    if (actionKey === 'assign') {
      setAssignTaskId(row.id as number);
      const assignees = Array.isArray(row.assignees)
        ? (row.assignees as Assignee[])
        : [];
      setAssignCurrentUsers(assignees);
      setAssignOpen(true);
      return;
    }

    if (actionKey === 'pdf') {
      const rowId = row.id as number;
      setPdfLoading(rowId);
      try {
        const { data: genData } = await api.post('/documents/pdf/generate', {
          entityType: config.slug,
          entityId: rowId,
          entityData: row,
        });
        const { data: blob } = await api.get(
          `/documents/pdf/download/${genData.filename}`,
          { responseType: 'blob' },
        );
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = genData.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addToast('success', 'PDF скачан');
      } catch {
        addToast('error', 'Не удалось сформировать PDF');
      } finally {
        setPdfLoading(null);
      }
    }
  };

  return (
    <ErrorBoundary>
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{config.title}</h1>
          {config.hasPdf && (
            <button
              onClick={handleDownloadListPdf}
              disabled={pdfListLoading || crud.loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors disabled:opacity-50"
              title="Скачать PDF таблицы"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {pdfListLoading ? 'Формирование...' : 'Скачать PDF'}
            </button>
          )}
        </div>

        <DataTable
          columns={config.columns}
          data={crud.data}
          total={crud.total}
          page={crud.page}
          limit={crud.limit}
          loading={crud.loading}
          searchPlaceholder={config.searchField ? `Поиск по ${config.searchField}...` : 'Поиск...'}
          onPageChange={crud.setPage}
          onSearch={crud.setSearch}
          onSort={crud.setSort}
          onEdit={config.canEdit !== false ? handleEdit : undefined}
          onDelete={config.canDelete !== false ? ((row) => setDeleteItem(row)) : undefined}
          onCreate={config.canCreate !== false ? handleCreate : undefined}
          canCreate={config.canCreate !== false}
          canEdit={config.canEdit !== false}
          canDelete={config.canDelete !== false}
          customRowActions={config.customRowActions}
          onCustomAction={handleCustomAction}
          loadingRowId={pdfLoading}
        />

        <EntityFormModal
          open={formOpen}
          title={editingItem ? `Редактировать: ${config.title}` : `Создать: ${config.title}`}
          fields={config.formFields}
          initialData={editingItem || undefined}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
          loading={crud.saving}
        />

        <DeleteConfirmModal
          open={!!deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={handleDeleteConfirm}
          loading={crud.saving}
        />

        {config.slug === 'tasks' && (
          <AssignUsersModal
            open={assignOpen}
            taskId={assignTaskId}
            currentAssignees={assignCurrentUsers}
            onClose={() => setAssignOpen(false)}
            onSaved={crud.refetch}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
