'use client';

import { useState } from 'react';
import type { CrudModuleConfig } from '@/types/admin';
import { useCrudData } from '@/lib/hooks/useCrudData';
import DataTable from './DataTable';
import EntityFormModal from './EntityFormModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import ErrorBoundary from './ErrorBoundary';

interface CrudPageProps {
  config: CrudModuleConfig;
}

export default function CrudPage({ config }: CrudPageProps) {
  const crud = useCrudData<Record<string, unknown>>({ apiEndpoint: config.apiEndpoint });

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [deleteItem, setDeleteItem] = useState<Record<string, unknown> | null>(null);

  const handleCreate = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (row: Record<string, unknown>) => {
    setEditingItem(row);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    let ok: boolean;
    if (editingItem) {
      ok = await crud.updateItem(editingItem.id as string | number, data);
    } else {
      ok = await crud.createItem(data);
    }
    if (ok) setFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    const ok = await crud.deleteItem(deleteItem.id as string | number);
    if (ok) setDeleteItem(null);
  };

  return (
    <ErrorBoundary>
      <div>
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{config.title}</h1>
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
      </div>
    </ErrorBoundary>
  );
}
