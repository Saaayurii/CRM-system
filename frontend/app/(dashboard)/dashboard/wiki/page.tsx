'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import NormDocumentModal from '@/components/wiki/NormDocumentModal';
import NormCategoryManagerModal from '@/components/wiki/NormCategoryManagerModal';
import {
  DOC_TYPES,
  DOC_STATUSES,
  DOC_TYPE_LABELS,
  DOC_TYPE_COLORS,
  DOC_STATUS_LABELS,
  DOC_STATUS_COLORS,
  fmtDate,
  type DocType,
  type DocStatus,
  type NormCategory,
  type NormDocumentListItem,
} from '@/lib/wiki/constants';

interface Stats {
  total: number;
  active: number;
  superseded: number;
  byType: Record<string, number>;
}

interface CatNode extends NormCategory {
  children: CatNode[];
}

function buildTree(cats: NormCategory[]): CatNode[] {
  const map = new Map<number, CatNode>();
  cats.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: CatNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) map.get(node.parentId)!.children.push(node);
    else roots.push(node);
  });
  const sort = (arr: CatNode[]) => {
    arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
    arr.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export default function ConstructionWikiPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const isSuperAdmin = user?.role?.code === 'super_admin' || user?.roleId === 1;

  const [categories, setCategories] = useState<NormCategory[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [docs, setDocs] = useState<NormDocumentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [docType, setDocType] = useState<DocType | ''>('');
  const [status, setStatus] = useState<DocStatus | ''>('');
  const [onlyBookmarks, setOnlyBookmarks] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [showDocModal, setShowDocModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  const tree = useMemo(() => buildTree(categories), [categories]);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/norm-categories');
      setCategories(data?.data || data || []);
    } catch {
      addToast('error', 'Не удалось загрузить категории');
    }
  }, [addToast]);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/norm-documents/stats');
      setStats(data);
    } catch {
      /* non-critical */
    }
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      if (onlyBookmarks) {
        const { data } = await api.get('/norm-bookmarks');
        let list: NormDocumentListItem[] = (data || []).map((d: any) => ({ ...d, isBookmarked: true }));
        if (activeCat) list = list.filter((d) => d.categoryId === activeCat);
        if (docType) list = list.filter((d) => d.docType === docType);
        if (status) list = list.filter((d) => d.status === status);
        if (debounced) {
          const q = debounced.toLowerCase();
          list = list.filter((d) => d.title.toLowerCase().includes(q) || (d.code || '').toLowerCase().includes(q));
        }
        setDocs(list);
        setTotal(list.length);
      } else {
        const params: any = { limit: 100 };
        if (activeCat) params.categoryId = activeCat;
        if (docType) params.docType = docType;
        if (status) params.status = status;
        if (debounced) params.q = debounced;
        const { data } = await api.get('/norm-documents', { params });
        setDocs(data?.data || []);
        setTotal(data?.total ?? (data?.data?.length || 0));
      }
    } catch {
      addToast('error', 'Не удалось загрузить документы');
    } finally {
      setLoading(false);
    }
  }, [activeCat, docType, status, debounced, onlyBookmarks, addToast]);

  useEffect(() => {
    loadCategories();
    loadStats();
  }, [loadCategories, loadStats]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleBookmark = async (doc: NormDocumentListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (doc.isBookmarked) await api.delete(`/norm-bookmarks/${doc.id}`);
      else await api.post(`/norm-bookmarks/${doc.id}`);
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, isBookmarked: !d.isBookmarked } : d)));
    } catch {
      addToast('error', 'Не удалось изменить избранное');
    }
  };

  const resetFilters = () => {
    setActiveCat(null);
    setDocType('');
    setStatus('');
    setOnlyBookmarks(false);
    setSearch('');
  };

  const renderCatNode = (node: CatNode, depth = 0) => {
    const isActive = activeCat === node.id;
    const hasChildren = node.children.length > 0;
    const isOpen = expanded.has(node.id);
    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 pr-2 py-1.5 rounded-lg cursor-pointer text-sm ${isActive ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={() => { setActiveCat(isActive ? null : node.id); setOnlyBookmarks(false); }}
        >
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} className="w-4 text-gray-400 shrink-0">
              {isOpen ? '▾' : '▸'}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <span className="shrink-0">{node.icon || '📁'}</span>
          <span className="flex-1 truncate">{node.name}</span>
          {typeof node.documentCount === 'number' && node.documentCount > 0 && (
            <span className="text-xs text-gray-400">{node.documentCount}</span>
          )}
        </div>
        {hasChildren && isOpen && node.children.map((c) => renderCatNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            📚 Строительная ВИКИ
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            База знаний строительных норм, правил и стандартов — СНиПы, ГОСТы, СП
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowCatModal(true)} className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
              Категории
            </button>
            <button onClick={() => setShowDocModal(true)} className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-violet-500 hover:bg-violet-600">
              + Документ
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Всего документов" value={stats.total} />
          <StatCard label="Действующих" value={stats.active} accent="text-emerald-600" />
          <StatCard label="Устаревших" value={stats.superseded} accent="text-red-500" />
          <StatCard label="Категорий" value={categories.length} />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Category tree */}
        <aside className="lg:w-72 shrink-0">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Категории</span>
              {(activeCat || docType || status || onlyBookmarks) && (
                <button onClick={resetFilters} className="text-xs text-violet-600 hover:underline">Сбросить</button>
              )}
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm ${!activeCat && !onlyBookmarks ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              onClick={() => { setActiveCat(null); setOnlyBookmarks(false); }}
            >
              <span>🗂️</span> <span>Все документы</span>
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm ${onlyBookmarks ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              onClick={() => { setOnlyBookmarks(true); setActiveCat(null); }}
            >
              <span>⭐</span> <span>Избранное</span>
            </div>
            <div className="mt-1 border-t border-gray-100 dark:border-gray-800 pt-1">
              {tree.map((n) => renderCatNode(n))}
              {tree.length === 0 && <p className="px-2 py-3 text-xs text-gray-400">Категории не созданы.</p>}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Search + filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[220px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию, коду, тексту…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <select value={docType} onChange={(e) => setDocType(e.target.value as DocType | '')} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
              <option value="">Все типы</option>
              {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value as DocStatus | '')} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
              <option value="">Любой статус</option>
              {DOC_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          <p className="text-xs text-gray-400 mb-3">Найдено: {total}</p>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <p>Документы не найдены.</p>
              {isSuperAdmin && <p className="text-sm mt-1">Добавьте первый документ кнопкой «+ Документ».</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => router.push(`/dashboard/wiki/${doc.id}`)}
                  className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 cursor-pointer hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-sm transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${DOC_TYPE_COLORS[doc.docType]}`}>
                          {DOC_TYPE_LABELS[doc.docType]}
                        </span>
                        {doc.code && <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{doc.code}</span>}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${DOC_STATUS_COLORS[doc.status]}`}>
                          {DOC_STATUS_LABELS[doc.status]}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate">
                        {doc.title}
                      </h3>
                      {doc.summary && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{doc.summary}</p>}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
                        {doc.category?.name && <span>🗂️ {doc.category.name}</span>}
                        {doc.effectiveDate && <span>Введён: {fmtDate(doc.effectiveDate)}</span>}
                        <span>👁 {doc.viewCount ?? 0}</span>
                        {(doc.tags || []).slice(0, 4).map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">#{t}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={(e) => toggleBookmark(doc, e)}
                      title={doc.isBookmarked ? 'В избранном' : 'В избранное'}
                      className={`shrink-0 text-xl ${doc.isBookmarked ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'}`}
                    >
                      {doc.isBookmarked ? '★' : '☆'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showDocModal && (
        <NormDocumentModal
          categories={categories}
          onClose={() => setShowDocModal(false)}
          onSaved={(id) => { setShowDocModal(false); loadStats(); loadCategories(); if (id) router.push(`/dashboard/wiki/${id}`); else loadDocs(); }}
        />
      )}
      {showCatModal && (
        <NormCategoryManagerModal
          categories={categories}
          onClose={() => setShowCatModal(false)}
          onChanged={() => { loadCategories(); loadStats(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
      <div className={`text-2xl font-bold ${accent || 'text-gray-900 dark:text-gray-100'}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}
