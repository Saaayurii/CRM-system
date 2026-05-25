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
import ManageMembersModal from './ManageMembersModal';
import ErrorBoundary from './ErrorBoundary';
import ClientPortalAccessModal from './ClientPortalAccessModal';
import { useIsClient } from '@/hooks/useIsClient';

interface CrudPageProps {
  config: CrudModuleConfig;
  /**
   * Optional handler for actions that aren't recognised by built-in keys
   * ('assign' | 'members' | 'pdf'). Receives a `refetch` callback so the
   * caller can refresh the table after performing the action.
   */
  onExtraAction?: (
    actionKey: string,
    row: Record<string, unknown>,
    refetch: () => void,
  ) => void;
  /** Если true — внутренний `<h1>` с config.title не отображается (для табов, где заголовок уже в табе). */
  hideTitle?: boolean;
  /** Если задан — клик по строке вызывает этот обработчик вместо открытия модалки редактирования. */
  onRowClick?: (row: Record<string, unknown>) => void;
}

interface Assignee {
  userId: number;
  userName?: string;
}

export default function CrudPage({ config, onExtraAction, hideTitle, onRowClick }: CrudPageProps) {
  const crud = useCrudData<Record<string, unknown>>({ apiEndpoint: config.apiEndpoint, prepareCreate: config.prepareCreate, prepareUpdate: config.prepareUpdate });
  const addToast = useToastStore((s) => s.addToast);
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);
  const [pdfListLoading, setPdfListLoading] = useState(false);

  // Клиент портала видит данные только в режиме просмотра (write-операции
  // блокируются api-gateway, но кнопки прячем заранее — чтобы не вводить в заблуждение).
  const isClient = useIsClient();
  const canCreate = !isClient && config.canCreate !== false;
  const canEdit = !isClient && config.canEdit !== false;
  const canDelete = !isClient && config.canDelete !== false;

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

  // Manage members modal state (teams only)
  const [membersOpen, setMembersOpen] = useState(false);
  const [membersTeamId, setMembersTeamId] = useState<number | null>(null);

  // Client portal access modal (clients only)
  const [portalClientId, setPortalClientId] = useState<number | null>(null);
  const [portalClientName, setPortalClientName] = useState<string | undefined>();

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

    if (actionKey === 'members') {
      setMembersTeamId(row.id as number);
      setMembersOpen(true);
      return;
    }

    if (actionKey === 'portal') {
      const r = row as Record<string, any>;
      const name =
        r.companyName ||
        [r.lastName, r.firstName, r.middleName].filter(Boolean).join(' ') ||
        `#${r.id}`;
      setPortalClientId(r.id as number);
      setPortalClientName(name);
      return;
    }

    if (onExtraAction && actionKey !== 'assign' && actionKey !== 'members' && actionKey !== 'pdf' && actionKey !== 'portal') {
      onExtraAction(actionKey, row, () => crud.refetch?.());
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
        {(!hideTitle || config.hasPdf) && (
        <div className="mb-6 flex items-center justify-between">
          {hideTitle ? <div /> : <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{config.title}</h1>}
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
        )}

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
          onEdit={canEdit ? handleEdit : undefined}
          onRowClick={onRowClick}
          onDelete={canDelete ? ((row) => setDeleteItem(row)) : undefined}
          onCreate={canCreate ? handleCreate : undefined}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          customRowActions={isClient ? undefined : config.customRowActions}
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

        {config.slug === 'teams' && (
          <ManageMembersModal
            open={membersOpen}
            teamId={membersTeamId}
            onClose={() => setMembersOpen(false)}
            onSaved={crud.refetch}
          />
        )}

        {config.slug === 'clients' && portalClientId !== null && (
          <ClientPortalAccessModal
            clientId={portalClientId}
            clientName={portalClientName}
            onClose={() => {
              setPortalClientId(null);
              setPortalClientName(undefined);
              crud.refetch?.();
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
