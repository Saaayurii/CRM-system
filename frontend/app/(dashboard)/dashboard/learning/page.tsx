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
  coverUrl?: string;
  category?: string;
  difficultyLevel?: string;
  durationMinutes?: number;
  description?: string;
  tags?: unknown;
  isPublished?: boolean;
  isMandatory?: boolean;
  targetRoleIds?: number[] | unknown;
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

const TYPE_META: Record<string, { label: string; emoji: string; badge: string; gradient: string }> = {
  video:        { label: 'Видео',       emoji: '▶',  badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', gradient: 'from-purple-500/20 to-fuchsia-500/20' },
  article:      { label: 'Статья',      emoji: '📄', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',         gradient: 'from-blue-500/20 to-sky-500/20' },
  instruction:  { label: 'Инструкция',  emoji: '📋', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', gradient: 'from-orange-500/20 to-amber-500/20' },
  checklist:    { label: 'Чек-лист',    emoji: '✅', badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',     gradient: 'from-emerald-500/20 to-teal-500/20' },
  presentation: { label: 'Презентация', emoji: '🖼', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', gradient: 'from-yellow-500/20 to-orange-500/20' },
};

const DIFFICULTY_META: Record<string, { label: string; badge: string }> = {
  beginner:     { label: 'Начальный',   badge: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  intermediate: { label: 'Средний',     badge: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  advanced:     { label: 'Продвинутый', badge: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

type Tab = 'all' | 'mandatory' | 'in_progress' | 'completed';
type SortKey = 'newest' | 'oldest' | 'popular' | 'duration_asc' | 'duration_desc';

export default function LearningLibraryPage() {
  const user = useAuthStore((s) => s.user);
  const roleCode = user?.role?.code;
  const roleId = user?.role?.id;
  const canManage = roleCode === 'admin' || roleCode === 'super_admin';

  const addToast = useToastStore((s) => s.addToast);

  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [progressByMaterial, setProgressByMaterial] = useState<Record<number, TrainingProgress>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [tab, setTab] = useState<Tab>('all');
  const [sort, setSort] = useState<SortKey>('newest');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/training-materials', { params: { page: 1, limit: 500 } });
      const arr: TrainingMaterial[] = Array.isArray(data) ? data : (data?.data ?? data?.items ?? []);
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
          /* ignore */
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

  const isMandatoryForMe = useCallback((m: TrainingMaterial) => {
    if (!m.isMandatory) return false;
    const roles = Array.isArray(m.targetRoleIds) ? (m.targetRoleIds as number[]) : [];
    if (roles.length === 0) return true; // обязателен для всех
    if (typeof roleId !== 'number') return false;
    return roles.includes(roleId);
  }, [roleId]);

  // Counters used for tabs and hero stats
  const counters = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let mandatoryUnfinished = 0;
    materials.forEach((m) => {
      const prog = progressByMaterial[m.id];
      const pct = prog?.progressPercentage ?? 0;
      const isDone = pct >= 100;
      const isStarted = pct > 0 || !!prog?.startedAt;
      if (isDone) completed += 1;
      else if (isStarted) inProgress += 1;
      if (isMandatoryForMe(m) && !isDone) mandatoryUnfinished += 1;
    });
    return { total: materials.length, completed, inProgress, mandatoryUnfinished };
  }, [materials, progressByMaterial, isMandatoryForMe]);

  const filtered = useMemo(() => {
    const s = debouncedSearch.trim().toLowerCase();
    let list = materials.filter((m) => {
      if (typeFilter && m.materialType !== typeFilter) return false;
      if (categoryFilter && m.category !== categoryFilter) return false;
      if (s) {
        const hay = [m.title, m.description, m.category, m.materialType, ...(Array.isArray(m.tags) ? (m.tags as string[]) : [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (tab === 'mandatory') {
        if (!isMandatoryForMe(m)) return false;
      } else if (tab === 'in_progress') {
        const prog = progressByMaterial[m.id];
        const pct = prog?.progressPercentage ?? 0;
        if (pct === 0 || pct >= 100) return false;
      } else if (tab === 'completed') {
        const prog = progressByMaterial[m.id];
        if ((prog?.progressPercentage ?? 0) < 100) return false;
      }
      return true;
    });

    // Sort
    const byNewest = (a: TrainingMaterial, b: TrainingMaterial) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    const dur = (m: TrainingMaterial) => m.durationMinutes ?? 0;
    if (sort === 'newest') list = list.slice().sort(byNewest);
    else if (sort === 'oldest') list = list.slice().sort((a, b) => -byNewest(a, b));
    else if (sort === 'popular') list = list.slice().sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
    else if (sort === 'duration_asc') list = list.slice().sort((a, b) => dur(a) - dur(b));
    else if (sort === 'duration_desc') list = list.slice().sort((a, b) => dur(b) - dur(a));
    return list;
  }, [materials, debouncedSearch, typeFilter, categoryFilter, tab, sort, progressByMaterial, isMandatoryForMe]);

  const completionPct = counters.total > 0 ? Math.round((counters.completed / counters.total) * 100) : 0;

  return (
    <div>
      {/* Hero */}
      <div className="mb-6 rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight">Библиотека обучающих материалов</h1>
            <p className="text-sm text-white/80 mt-1 max-w-xl">
              Видео, статьи, инструкции, чек-листы и тесты для развития сотрудников.
            </p>
            {counters.mandatoryUnfinished > 0 && (
              <button
                onClick={() => setTab('mandatory')}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
                У вас {counters.mandatoryUnfinished} обязательных не пройдено → открыть
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <ProgressRing pct={completionPct} />
            {canManage && (
              <Link
                href="/admin/training-materials"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Управление
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Всего" value={counters.total} />
          <StatCard label="Изучено" value={counters.completed} accent="green" />
          <StatCard label="В процессе" value={counters.inProgress} accent="blue" />
          <StatCard label="Обязательных не пройдено" value={counters.mandatoryUnfinished} accent={counters.mandatoryUnfinished > 0 ? 'red' : 'gray'} />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <TabBtn active={tab === 'all'} onClick={() => setTab('all')} label="Все" count={counters.total} />
        <TabBtn active={tab === 'mandatory'} onClick={() => setTab('mandatory')} label="Обязательные" count={counters.mandatoryUnfinished} accent={counters.mandatoryUnfinished > 0 ? 'red' : undefined} />
        <TabBtn active={tab === 'in_progress'} onClick={() => setTab('in_progress')} label="В процессе" count={counters.inProgress} />
        <TabBtn active={tab === 'completed'} onClick={() => setTab('completed')} label="Изученные" count={counters.completed} />
        {canManage && (
          <Link
            href="/dashboard/learning/admin"
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg text-gray-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Аналитика
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Поиск по названию, описанию, тегам..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-violet-400"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-violet-400"
        >
          <option value="">Все типы</option>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
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
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:border-violet-400"
        >
          <option value="newest">Сначала новые</option>
          <option value="oldest">Сначала старые</option>
          <option value="popular">По популярности</option>
          <option value="duration_asc">Короче — сначала</option>
          <option value="duration_desc">Длиннее — сначала</option>
        </select>
      </div>

      {loading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <EmptyState canManage={canManage} hasMaterials={materials.length > 0} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => (
            <MaterialCard
              key={m.id}
              material={m}
              progress={progressByMaterial[m.id]}
              mandatoryForMe={isMandatoryForMe(m)}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cards & atoms ────────────────────────────────────────────────────────────

function ProgressRing({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg viewBox="0 0 64 64" className="-rotate-90 w-16 h-16">
        <circle cx="32" cy="32" r={r} stroke="rgba(255,255,255,0.25)" strokeWidth="6" fill="none" />
        <circle
          cx="32" cy="32" r={r}
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
        {pct}%
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = 'gray' }: { label: string; value: number; accent?: 'gray' | 'green' | 'blue' | 'red' }) {
  const color = {
    gray:  'text-white',
    green: 'text-emerald-200',
    blue:  'text-sky-200',
    red:   'text-rose-200',
  }[accent];
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2.5">
      <div className={`text-2xl font-bold leading-tight ${color}`}>{value}</div>
      <div className="text-[11px] text-white/75 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

function TabBtn({ active, onClick, label, count, accent }: { active: boolean; onClick: () => void; label: string; count: number; accent?: 'red' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-violet-500 text-violet-600 dark:text-violet-400'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold ${
          accent === 'red'
            ? 'bg-red-500 text-white'
            : active
            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
        }`}>{count}</span>
      )}
    </button>
  );
}

function MaterialCard({ material, progress, mandatoryForMe, canManage }: {
  material: TrainingMaterial;
  progress?: TrainingProgress;
  mandatoryForMe: boolean;
  canManage: boolean;
}) {
  const t = TYPE_META[String(material.materialType ?? '')] ?? {
    label: String(material.materialType ?? '—'),
    emoji: '📚',
    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    gradient: 'from-gray-300/40 to-gray-400/40',
  };
  const d = material.difficultyLevel ? DIFFICULTY_META[material.difficultyLevel] : null;
  const pct = progress?.progressPercentage ?? 0;
  const done = pct >= 100;

  return (
    <Link
      href={`/dashboard/learning/${material.id}`}
      className="group text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-400 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col"
    >
      <div className={`relative h-32 w-full overflow-hidden bg-gradient-to-br ${t.gradient}`}>
        {material.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={material.coverUrl} alt={material.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-70 group-hover:scale-110 transition-transform duration-300">
            {t.emoji}
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${t.badge}`}>
            {t.label}
          </span>
          {mandatoryForMe && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-500 text-white">
              Обязательно
            </span>
          )}
          {canManage && material.isPublished === false && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-800/80 text-white">
              Черновик
            </span>
          )}
        </div>
        {done && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      <div className="px-4 pt-3 pb-2 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
          {material.title}
        </h3>
        {material.description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {material.description}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-center gap-2 flex-wrap text-[11px] text-gray-500 dark:text-gray-400">
          {d && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${d.badge}`}>
              {d.label}
            </span>
          )}
          {material.category && <span className="truncate max-w-[110px]">📁 {material.category}</span>}
          {material.durationMinutes ? <span>⏱ {material.durationMinutes} мин</span> : null}
        </div>
      </div>

      <div className="h-1.5 bg-gray-100 dark:bg-gray-700">
        <div
          className={`h-full transition-all duration-500 ${done ? 'bg-green-500' : pct > 0 ? 'bg-violet-500' : 'bg-transparent'}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
          <div className="h-32 bg-gray-200 dark:bg-gray-700" />
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ canManage, hasMaterials }: { canManage: boolean; hasMaterials: boolean }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-6xl mb-3">📚</div>
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">
        {hasMaterials ? 'По выбранным фильтрам ничего не найдено' : 'Материалы ещё не добавлены'}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {hasMaterials
          ? 'Попробуйте сбросить фильтры или поискать по другому ключевому слову.'
          : canManage
          ? 'Добавьте первый материал, чтобы сотрудники могли начать обучение.'
          : 'Когда администратор добавит обучающие материалы, они появятся здесь.'}
      </p>
      {!hasMaterials && canManage && (
        <Link
          href="/admin/training-materials"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-violet-500 hover:bg-violet-600 text-white shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Добавить материал
        </Link>
      )}
    </div>
  );
}
