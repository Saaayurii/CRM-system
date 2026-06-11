'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CrudPage from '@/components/admin/CrudPage';
import { ADMIN_MODULES } from '@/lib/admin/modulesConfig';
import WarehousesTab from '@/components/warehouse/WarehousesTab';
import MovementsTab from '@/components/warehouse/MovementsTab';
import InventoryTab from '@/components/warehouse/InventoryTab';
import CalculatorsTab from '@/components/warehouse/CalculatorsTab';
import EquipmentQRModal from '@/components/warehouse/EquipmentQRModal';
import EquipmentMoveModal from '@/components/warehouse/EquipmentMoveModal';
import { useT } from '@/lib/i18n';

const TABS = [
  { key: 'warehouses',  label: 'Склады' },
  { key: 'equipment',   label: 'Оборудование' },
  { key: 'materials',   label: 'Материалы' },
  { key: 'calculators', label: 'Калькуляторы' },
  { key: 'inventory',   label: 'Инвентаризации' },
  { key: 'movements',   label: 'Перемещения' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function WarehousePage() {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('warehouseTab');
      if (v && TABS.some((t) => t.key === v)) return v as TabKey;
    }
    return 'warehouses';
  });
  const [qrFor, setQrFor]     = useState<Record<string, unknown> | null>(null);
  const [moveFor, setMoveFor] = useState<{ row: Record<string, unknown>; refetch: () => void } | null>(null);

  const handleTab = (k: TabKey) => {
    setTab(k);
    if (typeof window !== 'undefined') localStorage.setItem('warehouseTab', k);
  };

  const handleExtraAction = (key: string, row: Record<string, unknown>, refetch: () => void) => {
    if (key === 'qr')   setQrFor(row);
    if (key === 'move') setMoveFor({ row, refetch });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="sm:flex sm:justify-between sm:items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">{t('Склад')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Склады, оборудование, материалы, инвентаризация и перемещения
          </p>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'warehouses' && <WarehousesTab />}
      {tab === 'equipment'  && (
        <CrudPage
          config={ADMIN_MODULES.equipment}
          hideTitle
          onExtraAction={handleExtraAction}
          onRowClick={(row) => router.push(`/dashboard/warehouse/equipment/${row.id}`)}
        />
      )}
      {tab === 'materials'   && <CrudPage config={ADMIN_MODULES.materials} hideTitle />}
      {tab === 'calculators' && <CalculatorsTab />}
      {tab === 'inventory'   && <InventoryTab />}
      {tab === 'movements'   && <MovementsTab />}

      {qrFor && (
        <EquipmentQRModal
          equipment={qrFor as unknown as { id: number; name: string }}
          onClose={() => setQrFor(null)}
        />
      )}
      {moveFor && (
        <EquipmentMoveModal
          equipment={moveFor.row as unknown as { id: number; name: string }}
          onClose={() => setMoveFor(null)}
          onMoved={() => moveFor.refetch()}
        />
      )}
    </div>
  );
}
