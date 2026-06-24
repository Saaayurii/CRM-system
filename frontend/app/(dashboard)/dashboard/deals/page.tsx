'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import ShareButton from '@/components/share/ShareButton';

interface Stage {
  id: number;
  name: string;
  color: string;
  sortOrder: number;
  isWon?: boolean;
  isLost?: boolean;
}
interface DealClient {
  id: number;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}
interface Deal {
  id: number;
  stageId: number;
  title: string;
  description?: string;
  amount?: number | string | null;
  currency?: string;
  status?: string;
  clientId?: number | null;
  client?: DealClient | null;
  assignedManagerId?: number | null;
  expectedCloseDate?: string | null;
}

const clientName = (c?: DealClient | null) =>
  !c ? '' : c.companyName || [c.firstName, c.lastName].filter(Boolean).join(' ') || `Клиент #${c.id}`;

const fmtAmount = (a?: number | string | null) => {
  const n = typeof a === 'string' ? parseFloat(a) : a;
  if (!n) return '';
  return `${n.toLocaleString('ru-RU')} ₽`;
};

const emptyForm = { title: '', amount: '', clientId: '', description: '', stageId: '' };

export default function DealsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [clients, setClients] = useState<DealClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stagesRes, dealsRes] = await Promise.all([
        api.get('/deal-stages'),
        api.get('/deals'),
      ]);
      setStages(Array.isArray(stagesRes.data) ? stagesRes.data : stagesRes.data?.data ?? []);
      setDeals(Array.isArray(dealsRes.data) ? dealsRes.data : dealsRes.data?.data ?? []);
    } catch {
      addToast('error', 'Не удалось загрузить воронку');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
    api
      .get('/clients', { params: { limit: 200 } })
      .then(({ data }) => setClients(Array.isArray(data) ? data : data?.data ?? []))
      .catch(() => {});
  }, [load]);

  const moveDeal = async (dealId: number, stageId: number) => {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stageId === stageId) return;
    const prev = deals;
    setDeals((ds) => ds.map((d) => (d.id === dealId ? { ...d, stageId } : d)));
    try {
      await api.put(`/deals/${dealId}`, { stageId });
    } catch {
      setDeals(prev);
      addToast('error', 'Не удалось переместить сделку');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };
  const openEdit = (d: Deal) => {
    setEditing(d);
    setForm({
      title: d.title,
      amount: d.amount ? String(typeof d.amount === 'string' ? parseFloat(d.amount) : d.amount) : '',
      clientId: d.clientId ? String(d.clientId) : '',
      description: d.description || '',
      stageId: String(d.stageId),
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) {
      addToast('error', 'Введите название сделки');
      return;
    }
    setSaving(true);
    const body: any = {
      title: form.title.trim(),
      amount: form.amount ? Number(form.amount) : undefined,
      clientId: form.clientId ? Number(form.clientId) : undefined,
      description: form.description || undefined,
    };
    if (form.stageId) body.stageId = Number(form.stageId);
    try {
      if (editing) {
        await api.put(`/deals/${editing.id}`, body);
      } else {
        await api.post('/deals', body);
      }
      setModalOpen(false);
      load();
    } catch {
      addToast('error', 'Не удалось сохранить сделку');
    } finally {
      setSaving(false);
    }
  };

  const removeDeal = async () => {
    if (!editing) return;
    if (!confirm('Удалить сделку?')) return;
    try {
      await api.delete(`/deals/${editing.id}`);
      setModalOpen(false);
      setDeals((ds) => ds.filter((d) => d.id !== editing.id));
    } catch {
      addToast('error', 'Не удалось удалить сделку');
    }
  };

  const stageDeals = (stageId: number) => deals.filter((d) => d.stageId === stageId);
  const stageSum = (stageId: number) =>
    stageDeals(stageId).reduce((acc, d) => {
      const n = typeof d.amount === 'string' ? parseFloat(d.amount) : d.amount || 0;
      return acc + (n || 0);
    }, 0);

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Воронка продаж</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Перетаскивайте сделки между стадиями
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium"
        >
          + Сделка
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Загрузка…</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
          {stages.map((stage) => {
            const list = stageDeals(stage.id);
            const sum = stageSum(stage.id);
            return (
              <div
                key={stage.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage.id);
                }}
                onDragLeave={() => setDragOverStage((s) => (s === stage.id ? null : s))}
                onDrop={() => {
                  if (dragId != null) moveDeal(dragId, stage.id);
                  setDragId(null);
                  setDragOverStage(null);
                }}
                className={`shrink-0 w-72 rounded-xl bg-gray-50 dark:bg-gray-900/60 border ${
                  dragOverStage === stage.id
                    ? 'border-violet-400 dark:border-violet-500'
                    : 'border-gray-200 dark:border-gray-700'
                } flex flex-col`}
              >
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{stage.name}</span>
                  <span className="ml-auto text-xs text-gray-400">{list.length}</span>
                </div>
                {sum > 0 && (
                  <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    {fmtAmount(sum)}
                  </div>
                )}
                <div className="p-2 space-y-2 overflow-y-auto flex-1 min-h-[120px]">
                  {list.map((d) => (
                    <div
                      key={d.id}
                      draggable
                      onDragStart={() => setDragId(d.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => openEdit(d)}
                      className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 cursor-pointer hover:shadow-sm active:cursor-grabbing"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.title}</div>
                      {d.amount ? (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{fmtAmount(d.amount)}</div>
                      ) : null}
                      {d.client && (
                        <div className="text-xs text-gray-400 mt-1 truncate">{clientName(d.client)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !saving && setModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editing ? 'Сделка' : 'Новая сделка'}
            </h2>
            <label className="block text-xs text-gray-500 mb-1">Название *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm text-gray-900 dark:text-gray-100"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Сумма, ₽</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Стадия</label>
                <select
                  value={form.stageId}
                  onChange={(e) => setForm((f) => ({ ...f, stageId: e.target.value }))}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm text-gray-900 dark:text-gray-100"
                >
                  <option value="">{editing ? '' : 'Первая'}</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="block text-xs text-gray-500 mb-1">Клиент</label>
            <select
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">— не выбран —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {clientName(c)}
                </option>
              ))}
            </select>
            <label className="block text-xs text-gray-500 mb-1">Комментарий</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full mb-4 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm text-gray-900 dark:text-gray-100"
            />
            <div className="flex items-center gap-2">
              {editing && (
                <>
                  <button
                    onClick={removeDeal}
                    className="px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    Удалить
                  </button>
                  <ShareButton entityType="deal" entityId={editing.id} title={editing.title} />
                </>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Отмена
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
