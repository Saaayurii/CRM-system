'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import {
  WikiPageItem, WikiDraft, fmtDate, DRAFT_STATUS_LABELS, DRAFT_STATUS_COLORS,
} from '@/lib/wiki/pages-constants';
import { useT } from '@/lib/i18n';

interface TreeNode extends WikiPageItem {
  children: TreeNode[];
}

function buildTree(pages: WikiPageItem[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  pages.forEach((p) => map.set(p.id, { ...p, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parentPageId && map.has(node.parentPageId)) {
      map.get(node.parentPageId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

const ADMIN_ROLES = [1, 2, 3];

export default function WikiPagesListPage() {
  const t = useT();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = ADMIN_ROLES.includes(user?.roleId ?? 0);

  const [pages, setPages] = useState<WikiPageItem[]>([]);
  const [drafts, setDrafts] = useState<WikiDraft[]>([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pages' | 'moderation'>('pages');

  const tree = useMemo(() => buildTree(pages), [pages]);

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (debounced) params.q = debounced;
      const { data } = await api.get('/wiki-pages', { params });
      setPages(data?.data || []);
    } catch {
      addToast('error', 'Не удалось загрузить страницы');
    } finally {
      setLoading(false);
    }
  }, [debounced, addToast]);

  const loadDrafts = useCallback(async () => {
    try {
      const { data } = await api.get('/wiki-drafts', { params: isAdmin ? {} : { status: 'pending' } });
      setDrafts(data || []);
    } catch { /* non-critical */ }
  }, [isAdmin]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { loadPages(); }, [loadPages]);
  useEffect(() => { loadDrafts(); }, [loadDrafts]);

  const pendingCount = drafts.filter((d) => d.status === 'pending').length;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            📖 Корпоративная ВИКИ
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            База знаний компании — создавайте, редактируйте и публикуйте страницы
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/wiki-pages/new')}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-violet-500 hover:bg-violet-600"
        >
          + Создать страницу
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-5">
        <button
          onClick={() => setTab('pages')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${tab === 'pages' ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Страницы
        </button>
        <button
          onClick={() => { setTab('moderation'); loadDrafts(); }}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${tab === 'moderation' ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Модерация
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">{pendingCount}</span>
          )}
        </button>
      </div>

      {tab === 'pages' && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar tree */}
          <aside className="lg:w-64 shrink-0">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-2 mb-2">{t('Структура')}</p>
              {tree.length === 0 && !loading && (
                <p className="px-2 py-3 text-xs text-gray-400">{t('Страниц пока нет.')}</p>
              )}
              {tree.map((node) => <TreeNode key={node.id} node={node} depth={0} onNavigate={(id) => router.push(`/dashboard/wiki-pages/${id}`)} />)}
            </div>
          </aside>

          {/* Main area */}
          <div className="flex-1 min-w-0">
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('Поиск страниц по названию…')}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            {loading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />)}</div>
            ) : pages.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-2">📝</div>
                <p>{t('Страниц пока нет.')}</p>
                <button onClick={() => router.push('/dashboard/wiki-pages/new')} className="mt-3 text-sm text-violet-600 hover:underline">
                  Создать первую страницу
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    onClick={() => router.push(`/dashboard/wiki-pages/${page.id}`)}
                    className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 cursor-pointer hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-400">
                          {page.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-400">
                          {page.category && <span>🗂 {page.category}</span>}
                          <span>Версия {page.version ?? 1}</span>
                          <span>👁 {page.viewCount ?? 0}</span>
                          <span>Обновлено: {fmtDate(page.updatedAt)}</span>
                          {(page.tags as string[] || []).slice(0, 3).map((t) => (
                            <span key={t} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">#{t}</span>
                          ))}
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/wiki-pages/${page.id}/edit`); }}
                          className="shrink-0 px-3 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 hover:border-violet-300 opacity-0 group-hover:opacity-100 transition"
                        >
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

      {tab === 'moderation' && (
        <ModerationTab
          drafts={drafts}
          isAdmin={isAdmin}
          onRefresh={() => { loadDrafts(); loadPages(); }}
          onEdit={(d) => router.push(d.wikiPageId ? `/dashboard/wiki-pages/${d.wikiPageId}/edit?draft=${d.id}` : `/dashboard/wiki-pages/new?draft=${d.id}`)}
        />
      )}
    </div>
  );
}

function TreeNode({ node, depth, onNavigate }: { node: TreeNode; depth: number; onNavigate: (id: number) => void }) {
  const t = useT();
  const [open, setOpen] = useState(depth < 1);
  return (
    <div>
      <div
        className="flex items-center gap-1 pr-2 py-1.5 rounded-lg cursor-pointer text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => onNavigate(node.id)}
      >
        {node.children.length > 0 ? (
          <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className="w-4 text-gray-400 shrink-0">
            {open ? '▾' : '▸'}
          </button>
        ) : <span className="w-4 shrink-0" />}
        <span className="shrink-0">📄</span>
        <span className="flex-1 truncate">{node.title}</span>
      </div>
      {open && node.children.map((c) => <TreeNode key={c.id} node={c} depth={depth + 1} onNavigate={onNavigate} />)}
    </div>
  );
}

function ModerationTab({
  drafts, isAdmin, onRefresh, onEdit,
}: {
  drafts: WikiDraft[];
  isAdmin: boolean;
  onRefresh: () => void;
  onEdit: (d: WikiDraft) => void;
}) {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [reviewNote, setReviewNote] = useState<Record<number, string>>({});
  const [commentText, setCommentText] = useState<Record<number, string>>({});

  const filtered = statusFilter ? drafts.filter((d) => d.status === statusFilter) : drafts;

  const submit = async (draftId: number) => {
    try {
      await api.post(`/wiki-drafts/${draftId}/submit`);
      addToast('success', 'Отправлено на проверку');
      onRefresh();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Ошибка');
    }
  };

  const review = async (draftId: number, action: 'approved' | 'rejected') => {
    try {
      await api.post(`/wiki-drafts/${draftId}/review`, { action, reviewNote: reviewNote[draftId] });
      addToast('success', action === 'approved' ? 'Опубликовано' : 'Отклонено');
      onRefresh();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Ошибка');
    }
  };

  const addComment = async (draftId: number) => {
    const text = commentText[draftId]?.trim();
    if (!text) return;
    try {
      await api.post(`/wiki-drafts/${draftId}/comments`, { text });
      setCommentText((p) => ({ ...p, [draftId]: '' }));
      onRefresh();
    } catch {
      addToast('error', 'Не удалось добавить комментарий');
    }
  };

  const removeDraft = async (draftId: number) => {
    if (!confirm('Удалить черновик?')) return;
    try {
      await api.delete(`/wiki-drafts/${draftId}`);
      onRefresh();
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Ошибка');
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['', 'draft', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-violet-500 text-white' : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            {s === '' ? 'Все' : DRAFT_STATUS_LABELS[s]}
            {s === 'pending' && drafts.filter((d) => d.status === 'pending').length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                {drafts.filter((d) => d.status === 'pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>{t('Нет черновиков в этом статусе.')}</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((draft) => (
          <div key={draft.id} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{draft.title}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                  <span className={`px-2 py-0.5 rounded font-medium ${DRAFT_STATUS_COLORS[draft.status]}`}>
                    {DRAFT_STATUS_LABELS[draft.status]}
                  </span>
                  {draft.page && <span>→ страница «{draft.page.title}»</span>}
                  {!draft.page && <span className="text-violet-500">{t('Новая страница')}</span>}
                  <span>Обновлён: {fmtDate(draft.updatedAt)}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => onEdit(draft)} className="px-3 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 hover:border-violet-300">
                  Открыть
                </button>
                {draft.status === 'draft' && (
                  <button onClick={() => submit(draft.id)} className="px-3 py-1 text-xs rounded bg-violet-500 text-white hover:bg-violet-600">
                    На проверку
                  </button>
                )}
                {isAdmin && draft.status === 'pending' && (
                  <>
                    <button onClick={() => review(draft.id, 'approved')} className="px-3 py-1 text-xs rounded bg-emerald-500 text-white hover:bg-emerald-600">
                      Одобрить
                    </button>
                    <button onClick={() => review(draft.id, 'rejected')} className="px-3 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600">
                      Отклонить
                    </button>
                  </>
                )}
                {draft.status === 'draft' && (
                  <button onClick={() => removeDraft(draft.id)} className="px-3 py-1 text-xs rounded border border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-50">
                    Удалить
                  </button>
                )}
              </div>
            </div>

            {/* Review note input for admins */}
            {isAdmin && draft.status === 'pending' && (
              <div className="mb-3">
                <textarea
                  value={reviewNote[draft.id] || ''}
                  onChange={(e) => setReviewNote((p) => ({ ...p, [draft.id]: e.target.value }))}
                  placeholder={t('Комментарий к решению (необязательно)…')}
                  rows={2}
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-transparent outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                />
              </div>
            )}

            {/* Existing review note */}
            {draft.reviewNote && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium text-gray-500 dark:text-gray-400">{t('Комментарий:')}</span>
                {draft.reviewNote}
              </div>
            )}

            {/* Comments */}
            {(draft.comments || []).length > 0 && (
              <div className="space-y-2 mb-3 pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                {draft.comments!.map((c) => (
                  <div key={c.id} className="text-sm">
                    <span className="text-xs text-gray-400">Пользователь #{c.userId} · {fmtDate(c.createdAt)}</span>
                    <p className="text-gray-700 dark:text-gray-300">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={commentText[draft.id] || ''}
                onChange={(e) => setCommentText((p) => ({ ...p, [draft.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addComment(draft.id); } }}
                placeholder={t('Оставить комментарий…')}
                className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-transparent outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button onClick={() => addComment(draft.id)} className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700">
                Отправить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
