'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import Badge, { DEFECT_STATUS, DEFECT_SEVERITY } from '@/components/technadzor/Badge';
import ShareButton from '@/components/share/ShareButton';

interface Coord {
  x: number;
  y: number;
}
interface Defect {
  id: number;
  defectNumber?: string;
  title: string;
  severity?: number;
  status?: number;
  coordinates?: Coord | null;
}
interface SitePlan {
  id: number;
  title: string;
  description?: string;
  imageUrl: string;
  projectId?: number;
  constructionSiteId?: number;
  defects: Defect[];
}

// Цвет пина по критичности дефекта
const SEVERITY_PIN: Record<number, string> = {
  1: 'bg-green-500',
  2: 'bg-yellow-500',
  3: 'bg-orange-500',
  4: 'bg-red-600',
};
const pinColor = (d: Defect) => SEVERITY_PIN[d.severity ?? 0] ?? 'bg-violet-600';

export default function PlanViewerPage() {
  const params = useParams();
  const planId = Number(params?.id);
  const addToast = useToastStore((s) => s.addToast);

  const [plan, setPlan] = useState<SitePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const imgWrapRef = useRef<HTMLDivElement>(null);

  // Точка, по которой кликнули (доли 0..1) → открывает панель «новый / привязать»
  const [pending, setPending] = useState<Coord | null>(null);
  const [tab, setTab] = useState<'new' | 'existing'>('new');
  const [selected, setSelected] = useState<Defect | null>(null);

  // Форма нового дефекта
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<string>('2');
  const [saving, setSaving] = useState(false);

  // Непривязанные дефекты для режима «привязать существующий»
  const [unplaced, setUnplaced] = useState<Defect[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/site-plans/${planId}`);
      setPlan(data);
    } catch {
      addToast('error', 'Не удалось загрузить план');
    } finally {
      setLoading(false);
    }
  }, [planId, addToast]);

  useEffect(() => {
    if (planId) load();
  }, [planId, load]);

  // Подгружаем непривязанные дефекты при открытии вкладки «привязать»
  useEffect(() => {
    if (pending && tab === 'existing') {
      api
        .get('/defects', { params: { limit: 200, ...(plan?.projectId ? { projectId: plan.projectId } : {}) } })
        .then(({ data }) => {
          const arr: Defect[] = Array.isArray(data) ? data : data?.data ?? [];
          setUnplaced(arr.filter((d) => !(d as any).planId && !d.coordinates));
        })
        .catch(() => setUnplaced([]));
    }
  }, [pending, tab, plan?.projectId]);

  const onImageClick = (e: React.MouseEvent) => {
    if (!imgWrapRef.current) return;
    const rect = imgWrapRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    setSelected(null);
    setPending({ x: +x.toFixed(4), y: +y.toFixed(4) });
    setTab('new');
    setTitle('');
    setSeverity('2');
  };

  const createDefect = async () => {
    if (!pending || !title.trim()) {
      addToast('error', 'Введите название дефекта');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/defects', {
        defectNumber: `DEF-${Date.now()}`,
        title: title.trim(),
        severity: Number(severity),
        status: 0,
        planId,
        projectId: plan?.projectId,
        constructionSiteId: plan?.constructionSiteId,
        coordinates: pending,
        reportedDate: new Date().toISOString(),
      });
      setPlan((p) => (p ? { ...p, defects: [...p.defects, data] } : p));
      setPending(null);
      addToast('success', 'Дефект добавлен на план');
    } catch {
      addToast('error', 'Не удалось создать дефект');
    } finally {
      setSaving(false);
    }
  };

  const attachDefect = async (d: Defect) => {
    if (!pending) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/defects/${d.id}`, {
        planId,
        coordinates: pending,
      });
      setPlan((p) => (p ? { ...p, defects: [...p.defects, { ...d, ...data, coordinates: pending }] } : p));
      setPending(null);
      addToast('success', 'Дефект привязан к точке');
    } catch {
      addToast('error', 'Не удалось привязать дефект');
    } finally {
      setSaving(false);
    }
  };

  const detachDefect = async (d: Defect) => {
    setSaving(true);
    try {
      await api.put(`/defects/${d.id}`, { planId: null, coordinates: null });
      setPlan((p) => (p ? { ...p, defects: p.defects.filter((x) => x.id !== d.id) } : p));
      setSelected(null);
      addToast('success', 'Дефект снят с плана');
    } catch {
      addToast('error', 'Не удалось снять дефект');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-gray-400">Загрузка…</div>;
  if (!plan) return <div className="p-6 text-sm text-gray-400">План не найден</div>;

  const placed = plan.defects.filter((d) => d.coordinates);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard/technadzor/plans" className="text-violet-600 hover:underline">
            Планы
          </Link>
          <span className="text-gray-400">/</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{plan.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Дефектов на плане: {placed.length}
          </span>
          <ShareButton entityType="site-plan" entityId={plan.id} title={plan.title} />
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Кликните по плану, чтобы поставить точку дефекта. Нажмите на маркер — откроется карточка.
      </p>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-auto">
        <div
          ref={imgWrapRef}
          onClick={onImageClick}
          className="relative inline-block min-w-full cursor-crosshair select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plan.imageUrl} alt={plan.title} className="block w-full" draggable={false} />

          {placed.map((d) => (
            <button
              key={d.id}
              onClick={(e) => {
                e.stopPropagation();
                setPending(null);
                setSelected(d);
              }}
              style={{ left: `${(d.coordinates!.x * 100).toFixed(2)}%`, top: `${(d.coordinates!.y * 100).toFixed(2)}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full ${pinColor(d)} text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white shadow-md hover:scale-110 transition`}
              title={d.title}
            >
              {d.id}
            </button>
          ))}

          {/* Превью будущей точки */}
          {pending && (
            <span
              style={{ left: `${(pending.x * 100).toFixed(2)}%`, top: `${(pending.y * 100).toFixed(2)}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-violet-600/70 ring-2 ring-white animate-pulse"
            />
          )}
        </div>
      </div>

      {/* Панель создания/привязки */}
      {pending && (
        <div className="mt-4 rounded-xl border border-violet-300 dark:border-violet-700 bg-white dark:bg-gray-800 p-4 max-w-md">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setTab('new')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'new' ? 'bg-violet-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              Новый дефект
            </button>
            <button
              onClick={() => setTab('existing')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'existing' ? 'bg-violet-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              Привязать существующий
            </button>
            <button
              onClick={() => setPending(null)}
              className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm"
            >
              ✕
            </button>
          </div>

          {tab === 'new' ? (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Название дефекта *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                placeholder="Трещина в стене"
                className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm text-gray-900 dark:text-gray-100"
              />
              <label className="block text-xs text-gray-500 mb-1">Критичность</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full mb-4 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm text-gray-900 dark:text-gray-100"
              >
                {Object.entries(DEFECT_SEVERITY).map(([v, s]) => (
                  <option key={v} value={v}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                onClick={createDefect}
                disabled={saving}
                className="w-full px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Сохранение…' : 'Поставить дефект'}
              </button>
            </div>
          ) : (
            <div className="max-h-72 overflow-auto -mx-1">
              {unplaced.length === 0 ? (
                <div className="text-sm text-gray-400 px-1 py-4">Нет свободных дефектов для привязки</div>
              ) : (
                unplaced.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => attachDefect(d)}
                    disabled={saving}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between gap-2"
                  >
                    <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{d.title}</span>
                    {d.severity ? <Badge label={DEFECT_SEVERITY[d.severity]?.label ?? ''} color={DEFECT_SEVERITY[d.severity]?.color} /> : null}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Карточка выбранного пина */}
      {selected && (
        <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 max-w-md">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selected.title}</div>
              <div className="text-xs text-gray-400">{selected.defectNumber}</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm">✕</button>
          </div>
          <div className="flex gap-2 mb-3">
            {selected.status !== undefined && <Badge label={DEFECT_STATUS[selected.status]?.label ?? ''} color={DEFECT_STATUS[selected.status]?.color} />}
            {selected.severity ? <Badge label={DEFECT_SEVERITY[selected.severity]?.label ?? ''} color={DEFECT_SEVERITY[selected.severity]?.color} /> : null}
          </div>
          <div className="flex gap-2">
            <Link
              href={`/dashboard/technadzor/defects/${selected.id}`}
              className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium"
            >
              Открыть карточку
            </Link>
            <button
              onClick={() => detachDefect(selected)}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Снять с плана
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
