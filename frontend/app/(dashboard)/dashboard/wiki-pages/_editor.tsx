'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import BlockEditor, { Block, newBlock } from '@/components/wiki/BlockEditor';
import { WikiPageDetail, WikiDraft, WikiVersion, fmtDateTime } from '@/lib/wiki/pages-constants';

interface Props {
  pageId: number | null;
}

const ADMIN_ROLES = [1, 2, 3];
const AUTOSAVE_INTERVAL = 30_000;

export default function WikiEditorPage({ pageId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftIdParam = searchParams?.get('draft') ? Number(searchParams.get('draft')) : null;
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = ADMIN_ROLES.includes(user?.roleId ?? 0);

  const [page, setPage] = useState<WikiPageDetail | null>(null);
  const [draft, setDraft] = useState<WikiDraft | null>(null);
  const [versions, setVersions] = useState<WikiVersion[]>([]);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([newBlock()]);

  const [preview, setPreview] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const draftRef = useRef<WikiDraft | null>(null);
  draftRef.current = draft;

  const blocksRef = useRef<Block[]>(blocks);
  blocksRef.current = blocks;
  const titleRef = useRef(title);
  titleRef.current = title;
  const categoryRef = useRef(category);
  categoryRef.current = category;
  const tagsRef = useRef(tags);
  tagsRef.current = tags;

  const loadPage = useCallback(async () => {
    if (!pageId) { setLoading(false); return; }
    try {
      const { data } = await api.get<WikiPageDetail>(`/wiki-pages/${pageId}`);
      setPage(data);
      setTitle(data.title || '');
      setCategory(data.category || '');
      setTags((data.tags as string[] || []).join(', '));
      setBlocks((data.blocks as Block[]) || [newBlock()]);
    } catch {
      addToast('error', 'Страница не найдена');
    } finally {
      setLoading(false);
    }
  }, [pageId, addToast]);

  const loadDraft = useCallback(async (id: number) => {
    try {
      const { data } = await api.get<WikiDraft>(`/wiki-drafts/${id}`);
      setDraft(data);
      setTitle(data.title);
      setCategory(data.category || '');
      setTags((data.tags as string[] || []).join(', '));
      setBlocks((data.blocks as Block[]) || [newBlock()]);
    } catch { /* ignore */ }
  }, []);

  const loadVersions = useCallback(async () => {
    if (!pageId) return;
    try {
      const { data } = await api.get<WikiVersion[]>(`/wiki-pages/${pageId}/versions`);
      setVersions(data || []);
    } catch { /* ignore */ }
  }, [pageId]);

  useEffect(() => {
    loadPage();
    if (draftIdParam) loadDraft(draftIdParam);
    if (pageId) loadVersions();
  }, [loadPage, draftIdParam, loadDraft, loadVersions, pageId]);

  const parseTags = (s: string) => s.split(',').map((t) => t.trim()).filter(Boolean);

  const autoSave = useCallback(async () => {
    const t = titleRef.current.trim();
    if (!t) return;
    const payload = {
      title: t,
      category: categoryRef.current || undefined,
      tags: parseTags(tagsRef.current),
      blocks: blocksRef.current,
      wikiPageId: pageId ?? undefined,
    };
    try {
      if (draftRef.current) {
        await api.put(`/wiki-drafts/${draftRef.current.id}`, payload);
      } else {
        const { data } = await api.post('/wiki-drafts', payload);
        setDraft(data);
      }
      setLastSaved(new Date());
    } catch { /* silent */ }
  }, [pageId]);

  // Auto-save every 30s
  useEffect(() => {
    const interval = setInterval(autoSave, AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [autoSave]);

  const saveDraft = async () => {
    const t = title.trim();
    if (!t) { addToast('error', 'Введите заголовок'); return; }
    setSaving(true);
    try {
      const payload = {
        title: t,
        category: category || undefined,
        tags: parseTags(tags),
        blocks,
        wikiPageId: pageId ?? undefined,
      };
      if (draft) {
        await api.put(`/wiki-drafts/${draft.id}`, payload);
        addToast('success', 'Черновик сохранён');
      } else {
        const { data } = await api.post('/wiki-drafts', payload);
        setDraft(data);
        addToast('success', 'Черновик создан');
      }
      setLastSaved(new Date());
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    let d = draft;
    if (!d) {
      const t = title.trim();
      if (!t) { addToast('error', 'Введите заголовок'); return; }
      try {
        const { data } = await api.post('/wiki-drafts', {
          title: t, category: category || undefined, tags: parseTags(tags), blocks, wikiPageId: pageId ?? undefined,
        });
        d = data;
        setDraft(data);
      } catch (e: any) {
        addToast('error', e?.response?.data?.message || 'Ошибка');
        return;
      }
    }
    try {
      await api.post(`/wiki-drafts/${d!.id}/submit`);
      addToast('success', 'Черновик отправлен на модерацию');
      router.push('/dashboard/wiki-pages?tab=moderation');
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Ошибка');
    }
  };

  const publishDirect = async () => {
    const t = title.trim();
    if (!t) { addToast('error', 'Введите заголовок'); return; }
    setSaving(true);
    try {
      const payload = { title: t, category: category || undefined, tags: parseTags(tags), blocks };
      if (pageId) {
        await api.put(`/wiki-pages/${pageId}`, payload);
        addToast('success', 'Страница опубликована');
        router.push(`/dashboard/wiki-pages/${pageId}`);
      } else {
        const { data } = await api.post('/wiki-pages', payload);
        addToast('success', 'Страница создана');
        router.push(`/dashboard/wiki-pages/${data.id}`);
      }
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Ошибка публикации');
    } finally {
      setSaving(false);
    }
  };

  const restoreVersion = async (v: WikiVersion) => {
    if (!confirm(`Восстановить версию ${v.versionNum} («${v.title}»)?`)) return;
    setTitle(v.title);
    setBlocks(v.blocks as Block[] || [newBlock()]);
    addToast('success', `Восстановлена версия ${v.versionNum}. Сохраните или опубликуйте изменения.`);
    setShowVersions(false);
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
        <div className="h-8 w-56 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-4" />
        <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-violet-600">
          ← Назад
        </button>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-gray-400">
              Сохранено {lastSaved.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => setPreview((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${preview ? 'bg-violet-100 dark:bg-violet-500/15 border-violet-300 dark:border-violet-500/40 text-violet-700 dark:text-violet-300' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            {preview ? '✏️ Редактор' : '👁 Предпросмотр'}
          </button>
          {pageId && (
            <button onClick={() => { setShowVersions((v) => !v); if (!showVersions) loadVersions(); }} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
              📋 История
            </button>
          )}
          <button onClick={saveDraft} disabled={saving} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50">
            {saving ? 'Сохраняю…' : 'Сохранить черновик'}
          </button>
          {!isAdmin && (
            <button onClick={submitForReview} className="px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-amber-500 hover:bg-amber-600">
              Отправить на проверку
            </button>
          )}
          {isAdmin && (
            <button onClick={publishDirect} disabled={saving} className="px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50">
              {saving ? '…' : pageId ? 'Опубликовать' : 'Создать страницу'}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-5">
        {/* Main editor */}
        <div className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6">
          {/* Meta fields */}
          {!preview && (
            <div className="space-y-3 mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Заголовок страницы…"
                className="w-full text-2xl font-bold bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-600"
              />
              <div className="flex gap-3 flex-wrap">
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Категория…"
                  className="flex-1 min-w-[140px] text-sm bg-transparent border-b border-gray-200 dark:border-gray-700 outline-none py-1 text-gray-600 dark:text-gray-300"
                />
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Теги (через запятую)…"
                  className="flex-1 min-w-[200px] text-sm bg-transparent border-b border-gray-200 dark:border-gray-700 outline-none py-1 text-gray-600 dark:text-gray-300"
                />
              </div>
            </div>
          )}

          {preview ? (
            <div className="space-y-2">
              <h1 className="text-3xl font-bold mb-4">{title || <span className="text-gray-400">Без заголовка</span>}</h1>
              <BlockEditor blocks={blocks} onChange={() => {}} readOnly />
            </div>
          ) : (
            <BlockEditor blocks={blocks} onChange={setBlocks} />
          )}
        </div>

        {/* Version history sidebar */}
        {showVersions && (
          <aside className="w-72 shrink-0">
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
              <h3 className="font-semibold mb-3 flex items-center justify-between">
                История версий
                <button onClick={() => setShowVersions(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              </h3>
              {versions.length === 0 ? (
                <p className="text-sm text-gray-400">Предыдущих версий нет.</p>
              ) : (
                <div className="space-y-2">
                  <div className="px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-sm">
                    <div className="font-medium text-violet-700 dark:text-violet-300">Версия {page?.version ?? 1} (текущая)</div>
                    <div className="text-xs text-gray-400 mt-0.5">{page?.title}</div>
                  </div>
                  {versions.map((v) => (
                    <div key={v.id} className="px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-800 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Версия {v.versionNum}</span>
                        <button onClick={() => restoreVersion(v)} className="text-xs text-violet-600 hover:underline">
                          Восстановить
                        </button>
                      </div>
                      {v.changeNote && <p className="text-xs text-gray-500 mt-0.5">{v.changeNote}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(v.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Draft status banner */}
      {draft && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-sm text-amber-700 dark:text-amber-300 flex items-center justify-between">
          <span>📝 Черновик #{draft.id} · Статус: <strong>{draft.status === 'draft' ? 'Черновик' : draft.status === 'pending' ? 'На проверке' : draft.status}</strong></span>
          {draft.reviewNote && <span className="text-xs ml-2 opacity-75">Комментарий: {draft.reviewNote}</span>}
        </div>
      )}
    </div>
  );
}
