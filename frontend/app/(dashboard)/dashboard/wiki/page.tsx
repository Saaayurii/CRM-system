'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import NormDocumentModal from '@/components/wiki/NormDocumentModal';
import NormCategoryManagerModal from '@/components/wiki/NormCategoryManagerModal';
import {
  DOC_TYPES, DOC_STATUSES, DOC_TYPE_LABELS, DOC_TYPE_COLORS,
  DOC_STATUS_LABELS, DOC_STATUS_COLORS, fmtDate,
  type DocType, type DocStatus, type NormCategory, type NormDocumentListItem,
} from '@/lib/wiki/constants';
import {
  WikiPageItem, WikiDraft, DRAFT_STATUS_LABELS, DRAFT_STATUS_COLORS,
} from '@/lib/wiki/pages-constants';
import { useT } from '@/lib/i18n';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Stats { total: number; active: number; superseded: number; byType: Record<string, number> }
interface CatNode extends NormCategory { children: CatNode[] }
interface TreeNode extends WikiPageItem { children: TreeNode[] }

type MainTab = 'corporate' | 'norms';

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildCatTree(cats: NormCategory[]): CatNode[] {
  const map = new Map<number, CatNode>();
  cats.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: CatNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) map.get(node.parentId)!.children.push(node);
    else roots.push(node);
  });
  const sort = (arr: CatNode[]) => { arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)); arr.forEach((n) => sort(n.children)); };
  sort(roots);
  return roots;
}

function buildPageTree(pages: WikiPageItem[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  pages.forEach((p) => map.set(p.id, { ...p, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parentPageId && map.has(node.parentPageId)) map.get(node.parentPageId)!.children.push(node);
    else roots.push(node);
  });
  return roots;
}

const ADMIN_ROLES = new Set([1, 2, 3]);

// ─── Main page ──────────────────────────────────────────────────────────────

function WikiPageInner() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role?.code === 'super_admin' || user?.roleId === 1;
  const isAdmin = ADMIN_ROLES.has(user?.roleId ?? 0);

  const [mainTab, setMainTab] = useState<MainTab>(
    (searchParams?.get('section') as MainTab) || 'corporate',
  );
  // Открыт по кнопке «Нормативы (ГОСТ, СП)» из Технадзора — показываем
  // хлебную крошку назад. При заходе через обычное левое меню её нет.
  const fromTechnadzor = searchParams?.get('from') === 'technadzor';

  return (
    <div className="px-4 sm:px-6 py-6 max-w-screen-2xl mx-auto">
      {fromTechnadzor && (
        <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
          <Link href="/dashboard/technadzor" className="text-violet-500 hover:text-violet-600">
            {t('Технадзор')}
          </Link>
          <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-700 dark:text-gray-200">{t('Нормативы (ГОСТ, СП)')}</span>
        </nav>
      )}
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold">{t('📖 ВИКИ')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {mainTab === 'corporate' ? 'База знаний компании' : 'Нормативная база — СНиПы, ГОСТы, СП'}
          </p>
        </div>
        {mainTab === 'corporate' && (
          <button
            onClick={() => router.push('/dashboard/wiki-pages/new')}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-500 hover:bg-violet-600"
          >
            + Создать страницу
          </button>
        )}
      </div>

      {/* Main section tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setMainTab('corporate')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${mainTab === 'corporate' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          ✏️ Корпоративная
        </button>
        <button
          onClick={() => setMainTab('norms')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${mainTab === 'norms' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          📚 Строительные нормы
        </button>
      </div>

      {mainTab === 'corporate' && <CorporateWikiSection isAdmin={isAdmin} />}
      {mainTab === 'norms' && <ConstructionNormsSection isSuperAdmin={isSuperAdmin} />}
    </div>
  );
}

export default function WikiPage() {
  const t = useT();
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">{t('Загрузка…')}</div>}>
      <WikiPageInner />
    </Suspense>
  );
}

// ─── Corporate Wiki Section ─────────────────────────────────────────────────

function CorporateWikiSection({ isAdmin }: { isAdmin: boolean }) {
  const t = useT();
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);

  const [pages, setPages] = useState<WikiPageItem[]>([]);
  const [drafts, setDrafts] = useState<WikiDraft[]>([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'pages' | 'moderation'>('pages');

  const tree = useMemo(() => buildPageTree(pages), [pages]);

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (debounced) params.q = debounced;
      const { data } = await api.get('/wiki-pages', { params });
      setPages(data?.data || []);
    } catch { addToast('error', 'Не удалось загрузить страницы'); }
    finally { setLoading(false); }
  }, [debounced, addToast]);

  const loadDrafts = useCallback(async () => {
    try {
      const { data } = await api.get('/wiki-drafts', { params: isAdmin ? {} : { status: 'pending' } });
      setDrafts(data || []);
    } catch { /* non-critical */ }
  }, [isAdmin]);

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { loadPages(); }, [loadPages]);
  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  const pendingCount = drafts.filter((d) => d.status === 'pending').length;

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 mb-5">
        {(['pages', 'moderation'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setSubTab(t); if (t === 'moderation') loadDrafts(); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${subTab === t ? 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            {t === 'pages' ? 'Страницы' : 'Модерация'}
            {t === 'moderation' && pendingCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {subTab === 'pages' && (
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-56 shrink-0">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-2 mb-2">{t('Структура')}</p>
              {tree.length === 0 && !loading && <p className="px-2 py-3 text-xs text-gray-400">{t('Страниц пока нет.')}</p>}
              {tree.map((node) => <PageTreeNode key={node.id} node={node} depth={0} onNavigate={(id) => router.push(`/dashboard/wiki-pages/${id}`)} />)}
            </div>
          </aside>
          <div className="flex-1 min-w-0">
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Поиск по названию…')}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-18 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl h-20" />)}</div>
            ) : pages.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <div className="text-4xl mb-2">📝</div><p>{t('Страниц пока нет.')}</p>
                <button onClick={() => router.push('/dashboard/wiki-pages/new')} className="mt-3 text-sm text-violet-600 hover:underline">{t('Создать первую')}</button>
              </div>
            ) : (
              <div className="space-y-3">
                {pages.map((page) => (
                  <div key={page.id} onClick={() => router.push(`/dashboard/wiki-pages/${page.id}`)}
                    className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 cursor-pointer hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-sm transition">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-400">{page.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
                          {page.category && <span>🗂 {page.category}</span>}
                          <span>v{page.version ?? 1}</span>
                          <span>👁 {page.viewCount ?? 0}</span>
                          <span>{fmtDate(page.updatedAt)}</span>
                          {(page.tags as string[] || []).slice(0, 3).map((t) => <span key={t} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">#{t}</span>)}
                        </div>
                      </div>
                      {isAdmin && (
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/wiki-pages/${page.id}/edit`); }}
                          className="shrink-0 px-3 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 hover:border-violet-300 opacity-0 group-hover:opacity-100 transition">
                          Редактировать
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'moderation' && (
        <ModerationPanel drafts={drafts} isAdmin={isAdmin}
          onRefresh={() => { loadDrafts(); loadPages(); }}
          onEdit={(d) => router.push(d.wikiPageId ? `/dashboard/wiki-pages/${d.wikiPageId}/edit?draft=${d.id}` : `/dashboard/wiki-pages/new?draft=${d.id}`)} />
      )}
    </div>
  );
}

// ─── Construction Norms Section ─────────────────────────────────────────────

function ConstructionNormsSection({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const t = useT();
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);

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

  const tree = useMemo(() => buildCatTree(categories), [categories]);

  const loadCategories = useCallback(async () => {
    try { const { data } = await api.get('/norm-categories'); setCategories(data?.data || data || []); }
    catch { addToast('error', 'Не удалось загрузить категории'); }
  }, [addToast]);

  const loadStats = useCallback(async () => {
    try { const { data } = await api.get('/norm-documents/stats'); setStats(data); } catch { /* non-critical */ }
  }, []);

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      if (onlyBookmarks) {
        const { data } = await api.get('/norm-bookmarks');
        let list: NormDocumentListItem[] = (data || []).map((d: any) => ({ ...d, isBookmarked: true }));
        if (activeCat) list = list.filter((d) => d.categoryId === activeCat);
        if (docType) list = list.filter((d) => d.docType === docType);
        if (status) list = list.filter((d) => d.status === status);
        if (debounced) { const q = debounced.toLowerCase(); list = list.filter((d) => d.title.toLowerCase().includes(q) || (d.code || '').toLowerCase().includes(q)); }
        setDocs(list); setTotal(list.length);
      } else {
        const params: any = { limit: 100 };
        if (activeCat) params.categoryId = activeCat;
        if (docType) params.docType = docType;
        if (status) params.status = status;
        if (debounced) params.q = debounced;
        const { data } = await api.get('/norm-documents', { params });
        setDocs(data?.data || []); setTotal(data?.total ?? (data?.data?.length || 0));
      }
    } catch { addToast('error', 'Не удалось загрузить документы'); }
    finally { setLoading(false); }
  }, [activeCat, docType, status, debounced, onlyBookmarks, addToast]);

  useEffect(() => { loadCategories(); loadStats(); }, [loadCategories, loadStats]);
  useEffect(() => { loadDocs(); }, [loadDocs]);

  const toggleExpand = (id: number) => setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const toggleBookmark = async (doc: NormDocumentListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (doc.isBookmarked) await api.delete(`/norm-bookmarks/${doc.id}`);
      else await api.post(`/norm-bookmarks/${doc.id}`);
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, isBookmarked: !d.isBookmarked } : d)));
    } catch { addToast('error', 'Не удалось изменить избранное'); }
  };

  const resetFilters = () => { setActiveCat(null); setDocType(''); setStatus(''); setOnlyBookmarks(false); setSearch(''); };

  const renderCatNode = (node: CatNode, depth = 0) => {
    const isActive = activeCat === node.id;
    const hasChildren = node.children.length > 0;
    const isOpen = expanded.has(node.id);
    return (
      <div key={node.id}>
        <div className={`flex items-center gap-1 pr-2 py-1.5 rounded-lg cursor-pointer text-sm ${isActive ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={() => { setActiveCat(isActive ? null : node.id); setOnlyBookmarks(false); }}>
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} className="w-4 text-gray-400 shrink-0">{isOpen ? '▾' : '▸'}</button>
          ) : <span className="w-4 shrink-0" />}
          <span className="shrink-0">{node.icon || '📁'}</span>
          <span className="flex-1 truncate">{node.name}</span>
          {typeof node.documentCount === 'number' && node.documentCount > 0 && <span className="text-xs text-gray-400">{node.documentCount}</span>}
        </div>
        {hasChildren && isOpen && node.children.map((c) => renderCatNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div>
      {/* Norms admin controls */}
      {isSuperAdmin && (
        <div className="flex gap-2 justify-end mb-4">
          <button onClick={() => setShowCatModal(true)} className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
            Категории
          </button>
          <button onClick={() => setShowDocModal(true)} className="px-3 py-2 rounded-lg text-sm font-medium text-white bg-violet-500 hover:bg-violet-600">
            + Документ
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label={t('Всего документов')} value={stats.total} />
          <StatCard label={t('Действующих')} value={stats.active} accent="text-emerald-600" />
          <StatCard label={t('Устаревших')} value={stats.superseded} accent="text-red-500" />
          <StatCard label={t('Категорий')} value={categories.length} />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-56 shrink-0">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{t('Категории')}</span>
              {(activeCat || docType || status || onlyBookmarks) && (
                <button onClick={resetFilters} className="text-xs text-violet-600 hover:underline">{t('Сбросить')}</button>
              )}
            </div>
            <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm ${!activeCat && !onlyBookmarks ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              onClick={() => { setActiveCat(null); setOnlyBookmarks(false); }}>
              <span>🗂️</span><span>{t('Все документы')}</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm ${onlyBookmarks ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              onClick={() => { setOnlyBookmarks(true); setActiveCat(null); }}>
              <span>⭐</span><span>{t('Избранное')}</span>
            </div>
            <div className="mt-1 border-t border-gray-100 dark:border-gray-800 pt-1">
              {tree.map((n) => renderCatNode(n))}
              {tree.length === 0 && <p className="px-2 py-3 text-xs text-gray-400">{t('Категории не созданы.')}</p>}
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Поиск по названию, коду…')}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <select value={docType} onChange={(e) => setDocType(e.target.value as DocType | '')} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
              <option value="">{t('Все типы')}</option>
              {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value as DocStatus | '')} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
              <option value="">{t('Любой статус')}</option>
              {DOC_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <p className="text-xs text-gray-400 mb-3">Найдено: {total}</p>

          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
          ) : docs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-2">📭</div><p>{t('Документы не найдены.')}</p>
              {isSuperAdmin && <p className="text-sm mt-1">{t('Добавьте первый документ кнопкой «+ Документ».')}</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div key={doc.id} onClick={() => router.push(`/dashboard/wiki/${doc.id}`)}
                  className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 cursor-pointer hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-sm transition">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${DOC_TYPE_COLORS[doc.docType]}`}>{DOC_TYPE_LABELS[doc.docType]}</span>
                        {doc.code && <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{doc.code}</span>}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${DOC_STATUS_COLORS[doc.status]}`}>{DOC_STATUS_LABELS[doc.status]}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate">{doc.title}</h3>
                      {doc.summary && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{doc.summary}</p>}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
                        {doc.category?.name && <span>🗂️ {doc.category.name}</span>}
                        {doc.effectiveDate && <span>Введён: {fmtDate(doc.effectiveDate)}</span>}
                        <span>👁 {doc.viewCount ?? 0}</span>
                        {(doc.tags || []).slice(0, 4).map((t) => <span key={t} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">#{t}</span>)}
                      </div>
                    </div>
                    <button onClick={(e) => toggleBookmark(doc, e)} title={doc.isBookmarked ? 'В избранном' : 'В избранное'}
                      className={`shrink-0 text-xl ${doc.isBookmarked ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'}`}>
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
        <NormDocumentModal categories={categories} onClose={() => setShowDocModal(false)}
          onSaved={(id) => { setShowDocModal(false); loadStats(); loadCategories(); if (id) router.push(`/dashboard/wiki/${id}`); else loadDocs(); }} />
      )}
      {showCatModal && (
        <NormCategoryManagerModal categories={categories} onClose={() => setShowCatModal(false)}
          onChanged={() => { loadCategories(); loadStats(); }} />
      )}
    </div>
  );
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const t = useT();
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
      <div className={`text-2xl font-bold ${accent || 'text-gray-900 dark:text-gray-100'}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

function PageTreeNode({ node, depth, onNavigate }: { node: TreeNode; depth: number; onNavigate: (id: number) => void }) {
  const t = useT();
  const [open, setOpen] = useState(depth < 1);
  return (
    <div>
      <div className="flex items-center gap-1 pr-2 py-1.5 rounded-lg cursor-pointer text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        style={{ paddingLeft: `${8 + depth * 14}px` }} onClick={() => onNavigate(node.id)}>
        {node.children.length > 0 ? (
          <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className="w-4 text-gray-400 shrink-0">{open ? '▾' : '▸'}</button>
        ) : <span className="w-4 shrink-0" />}
        <span className="shrink-0">📄</span>
        <span className="flex-1 truncate">{node.title}</span>
      </div>
      {open && node.children.map((c) => <PageTreeNode key={c.id} node={c} depth={depth + 1} onNavigate={onNavigate} />)}
    </div>
  );
}

function ModerationPanel({ drafts, isAdmin, onRefresh, onEdit }: {
  drafts: WikiDraft[]; isAdmin: boolean; onRefresh: () => void; onEdit: (d: WikiDraft) => void;
}) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewNote, setReviewNote] = useState<Record<number, string>>({});
  const [commentText, setCommentText] = useState<Record<number, string>>({});
  const filtered = statusFilter ? drafts.filter((d) => d.status === statusFilter) : drafts;

  const submit = async (id: number) => {
    try { await api.post(`/wiki-drafts/${id}/submit`); addToast('success', 'Отправлено на проверку'); onRefresh(); }
    catch (e: any) { addToast('error', e?.response?.data?.message || 'Ошибка'); }
  };
  const review = async (id: number, action: 'approved' | 'rejected') => {
    try { await api.post(`/wiki-drafts/${id}/review`, { action, reviewNote: reviewNote[id] }); addToast('success', action === 'approved' ? 'Опубликовано' : 'Отклонено'); onRefresh(); }
    catch (e: any) { addToast('error', e?.response?.data?.message || 'Ошибка'); }
  };
  const addComment = async (id: number) => {
    const text = commentText[id]?.trim(); if (!text) return;
    try { await api.post(`/wiki-drafts/${id}/comments`, { text }); setCommentText((p) => ({ ...p, [id]: '' })); onRefresh(); }
    catch { addToast('error', 'Ошибка'); }
  };
  const removeDraft = async (id: number) => {
    if (!confirm('Удалить черновик?')) return;
    try { await api.delete(`/wiki-drafts/${id}`); onRefresh(); }
    catch (e: any) { addToast('error', e?.response?.data?.message || 'Ошибка'); }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['', 'draft', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-violet-500 text-white' : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {s === '' ? 'Все' : DRAFT_STATUS_LABELS[s]}
            {s === 'pending' && drafts.filter((d) => d.status === 'pending').length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">{drafts.filter((d) => d.status === 'pending').length}</span>
            )}
          </button>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-gray-400"><p>{t('Нет черновиков.')}</p></div>}
      <div className="space-y-4">
        {filtered.map((draft) => (
          <div key={draft.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-semibold">{draft.title}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                  <span className={`px-2 py-0.5 rounded font-medium ${DRAFT_STATUS_COLORS[draft.status]}`}>{DRAFT_STATUS_LABELS[draft.status]}</span>
                  {draft.page ? <span>→ «{draft.page.title}»</span> : <span className="text-violet-500">{t('Новая страница')}</span>}
                  <span>{fmtDate(draft.updatedAt)}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                <button onClick={() => onEdit(draft)} className="px-3 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 hover:border-violet-300">{t('Открыть')}</button>
                {draft.status === 'draft' && <button onClick={() => submit(draft.id)} className="px-3 py-1 text-xs rounded bg-violet-500 text-white hover:bg-violet-600">{t('На проверку')}</button>}
                {isAdmin && draft.status === 'pending' && <>
                  <button onClick={() => review(draft.id, 'approved')} className="px-3 py-1 text-xs rounded bg-emerald-500 text-white hover:bg-emerald-600">{t('Одобрить')}</button>
                  <button onClick={() => review(draft.id, 'rejected')} className="px-3 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600">{t('Отклонить')}</button>
                </>}
                {draft.status === 'draft' && <button onClick={() => removeDraft(draft.id)} className="px-3 py-1 text-xs rounded border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50">{t('Удалить')}</button>}
              </div>
            </div>
            {isAdmin && draft.status === 'pending' && (
              <textarea value={reviewNote[draft.id] || ''} onChange={(e) => setReviewNote((p) => ({ ...p, [draft.id]: e.target.value }))}
                placeholder={t('Комментарий к решению…')} rows={2}
                className="w-full mb-3 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-transparent outline-none focus:ring-1 focus:ring-violet-500 resize-none" />
            )}
            {draft.reviewNote && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
                <span className="font-medium text-gray-500">{t('Комментарий:')}</span>{draft.reviewNote}
              </div>
            )}
            {(draft.comments || []).length > 0 && (
              <div className="space-y-2 mb-3 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                {draft.comments!.map((c) => (
                  <div key={c.id} className="text-sm">
                    <span className="text-xs text-gray-400">#{c.userId} · {fmtDate(c.createdAt)}</span>
                    <p className="text-gray-700 dark:text-gray-300">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={commentText[draft.id] || ''} onChange={(e) => setCommentText((p) => ({ ...p, [draft.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addComment(draft.id); } }}
                placeholder={t('Комментарий…')}
                className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-transparent outline-none focus:ring-1 focus:ring-violet-500" />
              <button onClick={() => addComment(draft.id)} className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">{t('Ответить')}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
