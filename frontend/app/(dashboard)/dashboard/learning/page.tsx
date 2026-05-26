'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

type MaterialType = 'video' | 'article' | 'instruction' | 'checklist' | 'presentation' | string;

interface TrainingMaterial {
  id: number;
  title: string;
  materialType?: MaterialType;
  content?: string;
  fileUrl?: string;
  category?: string;
  difficultyLevel?: string;
  durationMinutes?: number;
  description?: string;
  tags?: unknown;
  isPublished?: boolean;
  viewCount?: number;
  createdAt?: string;
}

interface TrainingProgress {
  id: number;
  userId: number;
  trainingMaterialId: number;
  startedAt?: string | null;
  completedAt?: string | null;
  progressPercentage: number;
}

const TYPE_META: Record<string, { label: string; emoji: string; badge: string }> = {
  video:        { label: 'Видео',       emoji: '▶',  badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  article:      { label: 'Статья',      emoji: '📄', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  instruction:  { label: 'Инструкция',  emoji: '📋', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  checklist:    { label: 'Чек-лист',    emoji: '✅', badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  presentation: { label: 'Презентация', emoji: '🖼', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
};

const DIFFICULTY_META: Record<string, { label: string; badge: string }> = {
  beginner:     { label: 'Начальный',   badge: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  intermediate: { label: 'Средний',     badge: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  advanced:     { label: 'Продвинутый', badge: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace('/', '');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.replace('/', '');
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    // not a URL
  }
  return null;
}

export default function LearningLibraryPage() {
  const user = useAuthStore((s) => s.user);
  const roleCode = user?.role?.code;
  const canManage = roleCode === 'admin' || roleCode === 'super_admin';

  const addToast = useToastStore((s) => s.addToast);

  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [progressByMaterial, setProgressByMaterial] = useState<Record<number, TrainingProgress>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const [selected, setSelected] = useState<TrainingMaterial | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/training-materials', { params: { page: 1, limit: 200 } });
      const arr: TrainingMaterial[] = Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
      // Non-admin sees only published
      const visible = canManage ? arr : arr.filter((m) => m.isPublished);
      setMaterials(visible);

      if (user?.id) {
        try {
          const { data: pData } = await api.get('/training-progress', { params: { userId: user.id, limit: 500 } });
          const pArr: TrainingProgress[] = Array.isArray(pData) ? pData : (pData?.data ?? pData?.items ?? []);
          const map: Record<number, TrainingProgress> = {};
          pArr.forEach((p) => { map[p.trainingMaterialId] = p; });
          setProgressByMaterial(map);
        } catch {
          // не критично — оставим пустым
        }
      }
    } catch {
      addToast('error', 'Не удалось загрузить материалы');
    } finally {
      setLoading(false);
    }
  }, [addToast, canManage, user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    materials.forEach((m) => { if (m.category) set.add(m.category); });
    return Array.from(set).sort();
  }, [materials]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return materials.filter((m) => {
      if (typeFilter && m.materialType !== typeFilter) return false;
      if (categoryFilter && m.category !== categoryFilter) return false;
      if (s) {
        const hay = [m.title, m.description, m.category, m.materialType]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [materials, search, typeFilter, categoryFilter]);

  const completedCount = useMemo(
    () => Object.values(progressByMaterial).filter((p) => p.progressPercentage >= 100).length,
    [progressByMaterial],
  );

  const setProgress = async (material: TrainingMaterial, percent: number) => {
    if (!user?.id) return;
    setSavingProgress(true);
    try {
      const existing = progressByMaterial[material.id];
      if (existing) {
        const body: Record<string, unknown> = { progressPercentage: percent };
        if (percent >= 100) body.completedAt = new Date().toISOString();
        const { data } = await api.put(`/training-progress/${existing.id}`, body);
        setProgressByMaterial((m) => ({ ...m, [material.id]: data as TrainingProgress }));
      } else {
        const body: Record<string, unknown> = {
          userId: user.id,
          trainingMaterialId: material.id,
          startedAt: new Date().toISOString(),
          progressPercentage: percent,
        };
        if (percent >= 100) body.completedAt = new Date().toISOString();
        const { data } = await api.post('/training-progress', body);
        setProgressByMaterial((m) => ({ ...m, [material.id]: data as TrainingProgress }));
      }
      addToast('success', percent >= 100 ? 'Отмечено как изученное' : 'Прогресс сохранён');
    } catch {
      addToast('error', 'Не удалось сохранить прогресс');
    } finally {
      setSavingProgress(false);
    }
  };

  const openMaterial = (m: TrainingMaterial) => {
    setSelected(m);
    // Auto-start (set startedAt) if no progress yet
    if (user?.id && !progressByMaterial[m.id]) {
      setProgress(m, 0);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            Библиотека обучающих материалов
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Видео, статьи, инструкции и чек-листы для сотрудников компании.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Изучено: <span className="font-semibold text-violet-600 dark:text-violet-400">{completedCount}</span> из {materials.length}
          </div>
          {canManage && (
            <Link
              href="/admin/training-materials"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-violet-500 hover:bg-violet-600 text-white shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Управление
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Поиск по названию или описанию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-violet-400"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-violet-400"
        >
          <option value="">Все типы</option>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-violet-400"
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {materials.length === 0
            ? 'Материалы ещё не добавлены.'
            : 'По выбранным фильтрам ничего не найдено.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => {
            const t = TYPE_META[String(m.materialType ?? '')] ?? { label: String(m.materialType ?? '—'), emoji: '📚', badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' };
            const d = m.difficultyLevel ? DIFFICULTY_META[m.difficultyLevel] : null;
            const prog = progressByMaterial[m.id];
            const pct = prog?.progressPercentage ?? 0;
            const done = pct >= 100;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => openMaterial(m)}
                className="text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-400 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
              >
                <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                  <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg ${t.badge}`}>
                    {t.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${t.badge}`}>
                        {t.label}
                      </span>
                      {d && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${d.badge}`}>
                          {d.label}
                        </span>
                      )}
                      {canManage && m.isPublished === false && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          Черновик
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-2">
                      {m.title}
                    </h3>
                  </div>
                </div>
                {m.description && (
                  <p className="px-4 pb-3 text-xs text-gray-500 dark:text-gray-400 line-clamp-3">
                    {m.description}
                  </p>
                )}
                <div className="mt-auto px-4 py-3 border-t border-gray-100 dark:border-gray-700/70 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-3">
                    {m.category && <span className="truncate max-w-[110px]">📁 {m.category}</span>}
                    {m.durationMinutes ? <span>⏱ {m.durationMinutes} мин</span> : null}
                  </div>
                  {done ? (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                      ✓ Изучено
                    </span>
                  ) : pct > 0 ? (
                    <span className="text-violet-600 dark:text-violet-400 font-medium">В процессе</span>
                  ) : null}
                </div>
                {pct > 0 && (
                  <div className="h-1 bg-gray-100 dark:bg-gray-700">
                    <div
                      className={`h-full ${done ? 'bg-green-500' : 'bg-violet-500'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Viewer modal */}
      {selected && (
        <ViewerModal
          material={selected}
          progress={progressByMaterial[selected.id]}
          onClose={() => setSelected(null)}
          onSetProgress={(pct) => setProgress(selected, pct)}
          saving={savingProgress}
        />
      )}
    </div>
  );
}

// ─── Viewer Modal ────────────────────────────────────────────────────────────

function ViewerModal({
  material,
  progress,
  onClose,
  onSetProgress,
  saving,
}: {
  material: TrainingMaterial;
  progress?: TrainingProgress;
  onClose: () => void;
  onSetProgress: (pct: number) => void | Promise<void>;
  saving: boolean;
}) {
  const t = TYPE_META[String(material.materialType ?? '')];
  const embed = material.fileUrl ? youtubeEmbed(material.fileUrl) : null;
  const done = (progress?.progressPercentage ?? 0) >= 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {t && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.badge}`}>
                  {t.label}
                </span>
              )}
              {material.category && (
                <span className="text-xs text-gray-500 dark:text-gray-400">📁 {material.category}</span>
              )}
              {material.durationMinutes ? (
                <span className="text-xs text-gray-500 dark:text-gray-400">⏱ {material.durationMinutes} мин</span>
              ) : null}
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{material.title}</h2>
            {material.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{material.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Закрыть"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {embed ? (
            <div className="aspect-video w-full">
              <iframe
                src={embed}
                title={material.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full rounded-lg border border-gray-200 dark:border-gray-700"
              />
            </div>
          ) : material.fileUrl ? (
            <a
              href={material.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0L4.586 13.757a4 4 0 105.657 5.657l1.414-1.414m-1.414-7.072a4 4 0 015.656 0l3.586 3.586a4 4 0 01-5.656 5.657l-1.415-1.415" />
              </svg>
              Открыть материал
            </a>
          ) : null}

          {material.content && (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-gray-700 dark:text-gray-200">
              {material.content}
            </div>
          )}

          {!material.content && !material.fileUrl && (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
              Контент материала не задан.
            </div>
          )}
        </div>

        {/* Footer / progress controls */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/60">
          <div className="text-sm">
            {done ? (
              <span className="text-green-600 dark:text-green-400 font-medium">✓ Материал изучен</span>
            ) : (progress?.progressPercentage ?? 0) > 0 ? (
              <span className="text-gray-600 dark:text-gray-300">
                Прогресс: <b>{progress?.progressPercentage}%</b>
              </span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">Изучение начато</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!done && (
              <button
                type="button"
                onClick={() => onSetProgress(100)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Отметить как изученное
              </button>
            )}
            {done && (
              <button
                type="button"
                onClick={() => onSetProgress(0)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Сбросить прогресс
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
