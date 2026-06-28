'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import EstimateImportFromPriceModal from './EstimateImportFromPriceModal';
import { useT } from '@/lib/i18n';
import { toLocalYmd } from '@/lib/utils';

interface EstimateItem {
  id: number;
  sectionId: number;
  priceItemId?: number | null;
  name: string;
  description?: string | null;
  unit?: string | null;
  quantity: number | string;
  unitPrice: number | string;
  amount: number | string;
  sortOrder: number;
}

interface EstimateSection {
  id: number;
  estimateId: number;
  name: string;
  description?: string | null;
  sortOrder: number;
  status: number;
  confirmedAt?: string | null;
  sectionDate?: string | null;
  totalAmount: number | string;
  items: EstimateItem[];
}

interface Estimate {
  id: number;
  projectId: number;
  contractId?: number | null;
  name: string;
  article: string;
  docNumber?: string | null;
  docDate?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  markupPercent: number | string;
  status: number;
  totalAmount: number | string;
  notes?: string | null;
  sections: EstimateSection[];
}

const INPUT_CLS =
  'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500';

const TINY_CLS =
  'w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-violet-500';

const STATUS_LABEL: Record<number, { label: string; color: string }> = {
  0: { label: 'Черновик', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  1: { label: 'Активная', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  2: { label: 'Подписана', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  3: { label: 'Отменена', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(v: unknown): string {
  return num(v).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '';
  return s.slice(0, 10);
}

export default function EstimatesPanel({ projectId }: { projectId: number }) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get<Estimate[]>('/estimates', { params: { projectId } });
      setEstimates(Array.isArray(data) ? data : []);
      if (selectedId === null && data?.length) setSelectedId(data[0].id);
    } catch {
      addToast('error', 'Не удалось загрузить сметы');
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedId, addToast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const selected = useMemo(
    () => estimates.find((e) => e.id === selectedId) ?? null,
    [estimates, selectedId],
  );

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить смету?')) return;
    try {
      await api.delete(`/estimates/${id}`);
      addToast('success', 'Смета удалена');
      if (selectedId === id) setSelectedId(null);
      load();
    } catch {
      addToast('error', 'Не удалось удалить');
    }
  };

  if (loading && estimates.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Сметы проекта — основа для генерации Сводного сметного расчёта, КС-2 и Акта приёмки.
        </p>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Создать смету
        </button>
      </div>

      {estimates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-10 text-center text-sm text-gray-500 dark:text-gray-400">
          В проекте ещё нет смет
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <div className="space-y-1.5">
            {estimates.map((e) => {
              const st = STATUS_LABEL[e.status] ?? STATUS_LABEL[0];
              const isSelected = e.id === selectedId;
              const total = num(e.totalAmount) * (1 + num(e.markupPercent) / 100);
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full text-left bg-white dark:bg-gray-800 rounded-lg p-3 transition-colors shadow-xs ${
                    isSelected
                      ? 'ring-2 ring-violet-500'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${st.color}`}>{st.label}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{e.article}</span>
                  </div>
                  <div className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate">
                    {e.docNumber && <span className="text-gray-400 dark:text-gray-500 mr-1">№{e.docNumber}</span>}
                    {e.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {fmtMoney(total)} ₽
                  </div>
                </button>
              );
            })}
          </div>

          {selected ? (
            <EstimateEditor
              estimate={selected}
              onChanged={load}
              onDelete={() => handleDelete(selected.id)}
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Выберите смету в списке слева
            </div>
          )}
        </div>
      )}

      {creating && (
        <CreateEstimateModal
          projectId={projectId}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setSelectedId(id);
            load();
          }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * Editor — реквизиты сметы, разделы, позиции
 * ════════════════════════════════════════════════════════════ */

function EstimateEditor({
  estimate,
  onChanged,
  onDelete,
}: {
  estimate: Estimate;
  onChanged: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [editingMeta, setEditingMeta] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'summary' | 'ks2' | 'act' | null>(null);

  const subtotal = num(estimate.totalAmount);
  const markup = subtotal * (num(estimate.markupPercent) / 100);
  const total = subtotal + markup;

  const handleExport = async (format: 'summary' | 'ks2' | 'act') => {
    try {
      setExportingFormat(format);
      const res = await api.get(`/estimates/${estimate.id}/export`, {
        params: { format },
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = toLocalYmd();
      a.download = `estimate-${estimate.id}-${format}-${stamp}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      addToast('error', 'Не удалось сформировать PDF');
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
                {estimate.docNumber && <span className="text-gray-400 mr-2">№{estimate.docNumber}</span>}
                {estimate.name}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300">
                {estimate.article}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {estimate.docDate && <>от {fmtDate(estimate.docDate)} · </>}
              {estimate.periodFrom && estimate.periodTo && (
                <>период {fmtDate(estimate.periodFrom)} — {fmtDate(estimate.periodTo)} · </>
              )}
              наценка {num(estimate.markupPercent)}%
            </p>
          </div>
          <div className="flex gap-1 flex-wrap">
            <ExportButton
              onClick={() => handleExport('summary')}
              loading={exportingFormat === 'summary'}
              label={t('Сводный расчёт')}
              title={t('Сводный сметный расчёт (PDF)')}
            />
            <ExportButton
              onClick={() => handleExport('ks2')}
              loading={exportingFormat === 'ks2'}
              label={t('КС-2')}
              title={t('Унифицированная форма КС-2 (PDF)')}
            />
            <ExportButton
              onClick={() => handleExport('act')}
              loading={exportingFormat === 'act'}
              label={t('Акт приёмки')}
              title={t('Акт приёмки выполненных работ (PDF)')}
            />
            <button
              onClick={() => setEditingMeta(true)}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
            >
              Реквизиты
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
              title={t('Удалить смету')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/60 text-sm">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('Сумма по позициям')}</p>
            <p className="font-semibold text-gray-700 dark:text-gray-200">{fmtMoney(subtotal)} ₽</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Наценка {num(estimate.markupPercent)}%</p>
            <p className="font-semibold text-gray-700 dark:text-gray-200">{fmtMoney(markup)} ₽</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('Итого')}</p>
            <p className="font-semibold text-violet-700 dark:text-violet-300">{fmtMoney(total)} ₽</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {estimate.sections.map((sec) => (
          <SectionCard
            key={sec.id}
            estimateId={estimate.id}
            section={sec}
            onChanged={onChanged}
          />
        ))}

        {addingSection ? (
          <SectionFormInline
            onCancel={() => setAddingSection(false)}
            onSave={async (payload) => {
              try {
                await api.post(`/estimates/${estimate.id}/sections`, payload);
                setAddingSection(false);
                onChanged();
                addToast('success', 'Раздел добавлен');
              } catch {
                addToast('error', 'Не удалось добавить раздел');
              }
            }}
          />
        ) : (
          <button
            onClick={() => setAddingSection(true)}
            className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Добавить раздел
          </button>
        )}
      </div>

      {editingMeta && (
        <EditEstimateModal
          estimate={estimate}
          onClose={() => setEditingMeta(false)}
          onSaved={() => {
            setEditingMeta(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * Section
 * ════════════════════════════════════════════════════════════ */

function SectionCard({
  estimateId,
  section,
  onChanged,
}: {
  estimateId: number;
  section: EstimateSection;
  onChanged: () => void;
}) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);

  const isConfirmed = section.status === 1;

  const handleConfirm = async () => {
    try {
      await api.put(`/estimates/${estimateId}/sections/${section.id}`, {
        name: section.name,
        status: isConfirmed ? 0 : 1,
        confirmedAt: isConfirmed ? null : toLocalYmd(),
      });
      onChanged();
    } catch {
      addToast('error', 'Не удалось обновить раздел');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Удалить раздел «${section.name}»?`)) return;
    try {
      await api.delete(`/estimates/${estimateId}/sections/${section.id}`);
      onChanged();
      addToast('success', 'Раздел удалён');
    } catch {
      addToast('error', 'Не удалось удалить');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-start gap-2 text-left flex-1 min-w-0"
        >
          <svg
            className={`mt-1 w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-800 dark:text-gray-100">{section.name}</span>
              {section.sectionDate && (
                <span className="text-xs text-gray-400 dark:text-gray-500">{fmtDate(section.sectionDate)}</span>
              )}
              {isConfirmed ? (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  ✓ Подтверждено{section.confirmedAt ? ` ${fmtDate(section.confirmedAt)}` : ''}
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  Не подтверждено
                </span>
              )}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {fmtMoney(section.totalAmount)} ₽
          </span>
          <button
            onClick={handleConfirm}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
              isConfirmed
                ? 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                : 'text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
            }`}
          >
            {isConfirmed ? 'Снять подтверждение' : 'Подтвердить'}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 text-gray-500 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded transition-colors"
            title={t('Редактировать')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.6a2 2 0 012.8 2.8L11.8 15 8 16l1-3.8 9.6-9.8z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
            title={t('Удалить раздел')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700/60">
          {section.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">{t('Наименование')}</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('Кол-во')}</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('Ед.')}</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('Цена')}</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{t('Сумма')}</th>
                    <th className="w-1 px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                  {section.items.map((it) => (
                    <ItemRow
                      key={it.id}
                      estimateId={estimateId}
                      sectionId={section.id}
                      item={it}
                      onChanged={onChanged}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {adding ? (
            <ItemFormInline
              onCancel={() => setAdding(false)}
              onSave={async (payload) => {
                try {
                  await api.post(`/estimates/${estimateId}/sections/${section.id}/items`, payload);
                  setAdding(false);
                  onChanged();
                } catch {
                  addToast('error', 'Не удалось добавить позицию');
                }
              }}
            />
          ) : (
            <div className="px-3 py-2 flex gap-2 flex-wrap">
              <button
                onClick={() => setPicking(true)}
                className="text-xs px-3 py-1.5 text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 rounded-lg flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Добавить из Прайса
              </button>
              <button
                onClick={() => setAdding(true)}
                className="text-xs px-3 py-1.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Свободная позиция
              </button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <EditSectionModal
          estimateId={estimateId}
          section={section}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}

      {picking && (
        <EstimateImportFromPriceModal
          onClose={() => setPicking(false)}
          onPick={async (chosen) => {
            try {
              for (const c of chosen) {
                await api.post(`/estimates/${estimateId}/sections/${section.id}/items`, {
                  priceItemId: c.priceItemId,
                  name: c.name,
                  unit: c.unit ?? undefined,
                  quantity: 1,
                  unitPrice: c.price,
                  selectedOptions: c.selectedOptions ?? undefined,
                });
              }
              setPicking(false);
              onChanged();
              addToast('success', `Добавлено: ${chosen.length}`);
            } catch {
              addToast('error', 'Не удалось добавить позиции');
            }
          }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * Item row — inline edit by click
 * ════════════════════════════════════════════════════════════ */

function ItemRow({
  estimateId,
  sectionId,
  item,
  onChanged,
}: {
  estimateId: number;
  sectionId: number;
  item: EstimateItem;
  onChanged: () => void;
}) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(String(item.quantity));
  const [price, setPrice] = useState(String(item.unitPrice));
  const [lastSyncedQty, setLastSyncedQty] = useState(item.quantity);
  const [lastSyncedPrice, setLastSyncedPrice] = useState(item.unitPrice);

  // Re-sync local edit state when the row is replaced by a fresh server payload
  if (item.quantity !== lastSyncedQty) {
    setLastSyncedQty(item.quantity);
    setQty(String(item.quantity));
  }
  if (item.unitPrice !== lastSyncedPrice) {
    setLastSyncedPrice(item.unitPrice);
    setPrice(String(item.unitPrice));
  }

  const handleSaveQtyPrice = async () => {
    const q = Number(qty.replace(',', '.'));
    const p = Number(price.replace(',', '.'));
    if (!Number.isFinite(q) || !Number.isFinite(p)) {
      addToast('error', 'Некорректное число');
      return;
    }
    try {
      await api.put(`/estimates/${estimateId}/sections/${sectionId}/items/${item.id}`, {
        name: item.name,
        quantity: q,
        unitPrice: p,
      });
      onChanged();
    } catch {
      addToast('error', 'Не удалось сохранить');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить позицию?')) return;
    try {
      await api.delete(`/estimates/${estimateId}/sections/${sectionId}/items/${item.id}`);
      onChanged();
    } catch {
      addToast('error', 'Не удалось удалить');
    }
  };

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
        <td className="px-3 py-2 text-gray-800 dark:text-gray-100">
          <div className="font-medium text-sm">{item.name}</div>
          {item.description && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.description}</div>
          )}
        </td>
        <td className="px-3 py-2 w-24">
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onBlur={() => {
              if (qty !== String(item.quantity)) handleSaveQtyPrice();
            }}
            className={`${TINY_CLS} text-right`}
            inputMode="decimal"
          />
        </td>
        <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap text-sm">{item.unit || ''}</td>
        <td className="px-3 py-2 w-28">
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={() => {
              if (price !== String(item.unitPrice)) handleSaveQtyPrice();
            }}
            className={`${TINY_CLS} text-right`}
            inputMode="decimal"
          />
        </td>
        <td className="px-3 py-2 text-right whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-gray-100">
          {fmtMoney(item.amount)}
        </td>
        <td className="px-2 py-2 whitespace-nowrap">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setEditing(true)}
              className="p-1 text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded transition-colors"
              title={t('Подробно')}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.6a2 2 0 012.8 2.8L11.8 15 8 16l1-3.8 9.6-9.8z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
              title={t('Удалить')}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
      {editing && (
        <EditItemModal
          estimateId={estimateId}
          sectionId={sectionId}
          item={item}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════
 * Inline form for adding a new item / section
 * ════════════════════════════════════════════════════════════ */

function ItemFormInline({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (payload: { name: string; quantity: number; unitPrice: number; unit?: string }) => Promise<void>;
}) {
  const t = useT();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('0');

  return (
    <div className="px-3 py-2 bg-violet-50/30 dark:bg-violet-500/5 flex gap-2 flex-wrap items-end">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('Наименование')}
        className={`${TINY_CLS} flex-1 min-w-[200px]`}
      />
      <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t('ед.')} className={`${TINY_CLS} w-20`} />
      <input value={qty} onChange={(e) => setQty(e.target.value)} placeholder={t('кол-во')} className={`${TINY_CLS} w-20`} inputMode="decimal" />
      <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t('цена')} className={`${TINY_CLS} w-24`} inputMode="decimal" />
      <button
        onClick={() => {
          if (!name.trim()) return;
          onSave({
            name: name.trim(),
            unit: unit || undefined,
            quantity: Number(qty.replace(',', '.')) || 0,
            unitPrice: Number(price.replace(',', '.')) || 0,
          });
        }}
        className="px-3 py-1 text-xs font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-lg"
      >
        Добавить
      </button>
      <button onClick={onCancel} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700">
        Отмена
      </button>
    </div>
  );
}

function SectionFormInline({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (payload: { name: string; sectionDate?: string }) => Promise<void>;
}) {
  const t = useT();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs p-3 flex gap-2 flex-wrap items-end">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('Название раздела')}
        className={`${INPUT_CLS} flex-1 min-w-[260px]`}
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className={`${INPUT_CLS} w-40`}
      />
      <button
        onClick={() => {
          if (!name.trim()) return;
          onSave({ name: name.trim(), sectionDate: date || undefined });
        }}
        className="px-4 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 text-white rounded-lg"
      >
        Создать
      </button>
      <button onClick={onCancel} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
        Отмена
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
 * Modals
 * ════════════════════════════════════════════════════════════ */

function CreateEstimateModal({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: number;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [name, setName] = useState('');
  const [article, setArticle] = useState('Работа');
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState(toLocalYmd());
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [markupPercent, setMarkupPercent] = useState('20');
  const [saving, setSaving] = useState(false);

  return (
    <ModalShell title={t('Новая смета')} onClose={onClose}>
      <div className="space-y-3">
        <Field label={t('Название')}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} placeholder={t('Например: Смета по работам Мэдисон')} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={t('Статья расходов')}>
            <select value={article} onChange={(e) => setArticle(e.target.value)} className={INPUT_CLS}>
              <option>{t('Работа')}</option>
              <option>{t('Черновые материалы')}</option>
              <option>{t('Чистовые материалы')}</option>
              <option>{t('Услуги')}</option>
              <option>{t('Прочее')}</option>
            </select>
          </Field>
          <Field label={t('Номер документа')}>
            <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} className={INPUT_CLS} placeholder="71" />
          </Field>
          <Field label={t('Дата документа')}>
            <input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label={t('Наценка, %')}>
            <input value={markupPercent} onChange={(e) => setMarkupPercent(e.target.value)} className={INPUT_CLS} inputMode="decimal" />
          </Field>
          <Field label={t('Период с')}>
            <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label={t('Период по')}>
            <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className={INPUT_CLS} />
          </Field>
        </div>
      </div>
      <ModalFooter
        onClose={onClose}
        saving={saving}
        onSave={async () => {
          if (!name.trim()) {
            addToast('error', 'Укажите название');
            return;
          }
          try {
            setSaving(true);
            const { data } = await api.post<{ id: number }>('/estimates', {
              projectId,
              name: name.trim(),
              article,
              docNumber: docNumber || undefined,
              docDate: docDate || undefined,
              periodFrom: periodFrom || undefined,
              periodTo: periodTo || undefined,
              markupPercent: Number(markupPercent.replace(',', '.')) || 0,
            });
            addToast('success', 'Смета создана');
            onCreated(data.id);
          } catch {
            addToast('error', 'Не удалось создать смету');
          } finally {
            setSaving(false);
          }
        }}
      />
    </ModalShell>
  );
}

function EditEstimateModal({
  estimate,
  onClose,
  onSaved,
}: {
  estimate: Estimate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [name, setName] = useState(estimate.name);
  const [article, setArticle] = useState(estimate.article);
  const [docNumber, setDocNumber] = useState(estimate.docNumber ?? '');
  const [docDate, setDocDate] = useState(fmtDate(estimate.docDate));
  const [periodFrom, setPeriodFrom] = useState(fmtDate(estimate.periodFrom));
  const [periodTo, setPeriodTo] = useState(fmtDate(estimate.periodTo));
  const [markupPercent, setMarkupPercent] = useState(String(num(estimate.markupPercent)));
  const [status, setStatus] = useState(estimate.status);
  const [saving, setSaving] = useState(false);

  return (
    <ModalShell title={t('Реквизиты сметы')} onClose={onClose}>
      <div className="space-y-3">
        <Field label={t('Название')}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label={t('Статья')}>
            <select value={article} onChange={(e) => setArticle(e.target.value)} className={INPUT_CLS}>
              <option>{t('Работа')}</option>
              <option>{t('Черновые материалы')}</option>
              <option>{t('Чистовые материалы')}</option>
              <option>{t('Услуги')}</option>
              <option>{t('Прочее')}</option>
            </select>
          </Field>
          <Field label={t('Статус')}>
            <select value={status} onChange={(e) => setStatus(Number(e.target.value))} className={INPUT_CLS}>
              <option value={0}>{t('Черновик')}</option>
              <option value={1}>{t('Активная')}</option>
              <option value={2}>{t('Подписана')}</option>
              <option value={3}>{t('Отменена')}</option>
            </select>
          </Field>
          <Field label={t('Номер документа')}>
            <input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label={t('Дата документа')}>
            <input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label={t('Период с')}>
            <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label={t('Период по')}>
            <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label={t('Наценка, %')}>
            <input value={markupPercent} onChange={(e) => setMarkupPercent(e.target.value)} className={INPUT_CLS} inputMode="decimal" />
          </Field>
        </div>
      </div>
      <ModalFooter
        onClose={onClose}
        saving={saving}
        onSave={async () => {
          try {
            setSaving(true);
            await api.put(`/estimates/${estimate.id}`, {
              name: name.trim() || estimate.name,
              article,
              docNumber: docNumber || null,
              docDate: docDate || null,
              periodFrom: periodFrom || null,
              periodTo: periodTo || null,
              markupPercent: Number(markupPercent.replace(',', '.')) || 0,
              status,
            });
            addToast('success', 'Сохранено');
            onSaved();
          } catch {
            addToast('error', 'Не удалось сохранить');
          } finally {
            setSaving(false);
          }
        }}
      />
    </ModalShell>
  );
}

function EditSectionModal({
  estimateId,
  section,
  onClose,
  onSaved,
}: {
  estimateId: number;
  section: EstimateSection;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [name, setName] = useState(section.name);
  const [description, setDescription] = useState(section.description ?? '');
  const [sectionDate, setSectionDate] = useState(fmtDate(section.sectionDate));
  const [saving, setSaving] = useState(false);

  return (
    <ModalShell title={t('Раздел сметы')} onClose={onClose}>
      <div className="space-y-3">
        <Field label={t('Название')}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} />
        </Field>
        <Field label={t('Описание')}>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={INPUT_CLS} />
        </Field>
        <Field label={t('Дата этапа')}>
          <input type="date" value={sectionDate} onChange={(e) => setSectionDate(e.target.value)} className={INPUT_CLS} />
        </Field>
      </div>
      <ModalFooter
        onClose={onClose}
        saving={saving}
        onSave={async () => {
          try {
            setSaving(true);
            await api.put(`/estimates/${estimateId}/sections/${section.id}`, {
              name: name.trim() || section.name,
              description: description || null,
              sectionDate: sectionDate || null,
            });
            onSaved();
            addToast('success', 'Сохранено');
          } catch {
            addToast('error', 'Не удалось сохранить');
          } finally {
            setSaving(false);
          }
        }}
      />
    </ModalShell>
  );
}

function EditItemModal({
  estimateId,
  sectionId,
  item,
  onClose,
  onSaved,
}: {
  estimateId: number;
  sectionId: number;
  item: EstimateItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? '');
  const [unit, setUnit] = useState(item.unit ?? '');
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [unitPrice, setUnitPrice] = useState(String(item.unitPrice));
  const [saving, setSaving] = useState(false);

  return (
    <ModalShell title={t('Позиция сметы')} onClose={onClose}>
      <div className="space-y-3">
        <Field label={t('Наименование')}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLS} />
        </Field>
        <Field label={t('Описание')}>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={INPUT_CLS} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('Ед. изм.')}>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} className={INPUT_CLS} />
          </Field>
          <Field label={t('Количество')}>
            <input value={quantity} onChange={(e) => setQuantity(e.target.value)} className={INPUT_CLS} inputMode="decimal" />
          </Field>
          <Field label={t('Цена')}>
            <input value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={INPUT_CLS} inputMode="decimal" />
          </Field>
        </div>
      </div>
      <ModalFooter
        onClose={onClose}
        saving={saving}
        onSave={async () => {
          try {
            setSaving(true);
            await api.put(`/estimates/${estimateId}/sections/${sectionId}/items/${item.id}`, {
              name: name.trim() || item.name,
              description: description || null,
              unit: unit || null,
              quantity: Number(quantity.replace(',', '.')) || 0,
              unitPrice: Number(unitPrice.replace(',', '.')) || 0,
            });
            onSaved();
            addToast('success', 'Сохранено');
          } catch {
            addToast('error', 'Не удалось сохранить');
          } finally {
            setSaving(false);
          }
        }}
      />
    </ModalShell>
  );
}

/* ════════════════════════════════════════════════════════════
 * UI helpers
 * ════════════════════════════════════════════════════════════ */

function ExportButton({
  onClick,
  loading,
  label,
  title,
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
  title: string;
}) {
  const t = useT();
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title={title}
      className="px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
    >
      {loading ? (
        <span className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M4 6h16M5 6v13a2 2 0 002 2h10a2 2 0 002-2V6" />
        </svg>
      )}
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const t = useT();
  return (
    <div className="-mx-6 -mb-5 mt-5 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
      <button
        onClick={onClose}
        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
      >
        Отмена
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="px-5 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
      >
        {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        Сохранить
      </button>
    </div>
  );
}
