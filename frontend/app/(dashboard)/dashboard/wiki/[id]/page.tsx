'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import MarkdownView from '@/components/wiki/MarkdownView';
import NormDocumentModal from '@/components/wiki/NormDocumentModal';
import {
  DOC_TYPE_LABELS,
  DOC_TYPE_COLORS,
  DOC_STATUS_LABELS,
  DOC_STATUS_COLORS,
  fmtDate,
  type NormCategory,
  type NormDocumentDetail,
} from '@/lib/wiki/constants';

export default function NormDocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const isSuperAdmin = user?.role?.code === 'super_admin' || user?.roleId === 1;

  const [doc, setDoc] = useState<NormDocumentDetail | null>(null);
  const [categories, setCategories] = useState<NormCategory[]>([]);
  const [relatedPages, setRelatedPages] = useState<{ id: number; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/norm-documents/${id}`);
      setDoc(data);
    } catch {
      addToast('error', 'Документ не найден');
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    load();
    api.get('/norm-categories').then(({ data }) => setCategories(data?.data || data || [])).catch(() => {});
  }, [id, load]);

  // Load corporate wiki pages that reference this norm via normRef blocks
  useEffect(() => {
    if (!doc) return;
    api.get('/wiki-pages', { params: { limit: 200 } })
      .then(({ data }) => {
        const pages: { id: number; title: string }[] = (data?.data || []).filter((p: any) => {
          const blocks: any[] = p.blocks || [];
          return blocks.some((b: any) => b.type === 'normRef' && b.attrs?.normId === doc.id);
        });
        setRelatedPages(pages);
      })
      .catch(() => {});
  }, [doc]);

  const toggleBookmark = async () => {
    if (!doc) return;
    try {
      if (doc.isBookmarked) await api.delete(`/norm-bookmarks/${doc.id}`);
      else await api.post(`/norm-bookmarks/${doc.id}`);
      setDoc({ ...doc, isBookmarked: !doc.isBookmarked });
    } catch {
      addToast('error', 'Не удалось изменить избранное');
    }
  };

  const remove = async () => {
    if (!doc || !confirm(`Удалить документ «${doc.title}»?`)) return;
    try {
      await api.delete(`/norm-documents/${doc.id}`);
      addToast('success', 'Документ удалён');
      router.push('/dashboard/wiki');
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Не удалось удалить');
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
        <div className="h-8 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-4" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="px-4 sm:px-6 py-16 text-center text-gray-400">
        <p>Документ не найден.</p>
        <Link href="/dashboard/wiki" className="text-violet-600 hover:underline text-sm">← К списку</Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.push('/dashboard/wiki?section=norms')} className="text-sm text-gray-500 hover:text-violet-600">
          ← Строительные нормы
        </button>
        <div className="flex items-center gap-2">
          <button onClick={toggleBookmark} className={`text-xl ${doc.isBookmarked ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600 hover:text-amber-400'}`} title="Избранное">
            {doc.isBookmarked ? '★' : '☆'}
          </button>
          {isSuperAdmin && (
            <>
              <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
                Редактировать
              </button>
              <button onClick={remove} className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 border border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10">
                Удалить
              </button>
            </>
          )}
        </div>
      </div>

      {/* Superseded banner */}
      {doc.status === 'superseded' && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-sm text-red-700 dark:text-red-300">
          ⚠️ Документ утратил силу{doc.supersededDate ? ` с ${fmtDate(doc.supersededDate)}` : ''}.
          {doc.supersededBy && (
            <> Действующая редакция:{' '}
              <Link href={`/dashboard/wiki/${doc.supersededBy.id}`} className="font-semibold underline">
                {doc.supersededBy.code || doc.supersededBy.title}
              </Link>
            </>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${DOC_TYPE_COLORS[doc.docType]}`}>
            {DOC_TYPE_LABELS[doc.docType]}
          </span>
          {doc.code && <span className="font-mono text-gray-500 dark:text-gray-400">{doc.code}</span>}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${DOC_STATUS_COLORS[doc.status]}`}>
            {DOC_STATUS_LABELS[doc.status]}
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-3">{doc.title}</h1>
        {doc.summary && <p className="text-gray-600 dark:text-gray-300 mb-4">{doc.summary}</p>}

        {/* Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
          <Meta label="Категория" value={doc.category?.name || '—'} />
          <Meta label="Вступление в силу" value={fmtDate(doc.effectiveDate)} />
          <Meta label="Дата отмены" value={fmtDate(doc.supersededDate)} />
          <Meta label="Просмотров" value={String(doc.viewCount ?? 0)} />
        </div>

        {/* Tags */}
        {(doc.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {doc.tags!.map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">#{t}</span>
            ))}
          </div>
        )}

        <div className="border-t border-gray-100 dark:border-gray-800 pt-5">
          <MarkdownView content={doc.content} />
        </div>

        {/* Attachments */}
        {(doc.attachments || []).length > 0 && (
          <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
            <h3 className="text-sm font-semibold mb-2 text-gray-500">Вложения</h3>
            <ul className="space-y-1">
              {doc.attachments!.map((a, i) => (
                <li key={i}>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-600 dark:text-violet-400 hover:underline">
                    📎 {a.name || a.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Related / supersedes */}
      {((doc.related || []).length > 0 || (doc.supersedes || []).length > 0) && (
        <div className="mt-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          {(doc.supersedes || []).length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2 text-gray-500">Заменяет документы</h3>
              <div className="flex flex-wrap gap-2">
                {doc.supersedes!.map((s) => (
                  <Link key={s.id} href={`/dashboard/wiki/${s.id}`} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:border-violet-300">
                    {s.code || s.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {(doc.related || []).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-gray-500">Связанные нормы</h3>
              <div className="flex flex-wrap gap-2">
                {doc.related!.map((r) => (
                  <Link key={r.id} href={`/dashboard/wiki/${r.id}`} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:border-violet-300">
                    <span className="font-mono text-gray-500">{r.code || ''}</span> {r.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cross-link: corporate wiki pages that reference this norm */}
      {relatedPages.length > 0 && (
        <div className="mt-5 bg-white dark:bg-gray-900 border border-violet-100 dark:border-violet-500/20 rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-3 text-violet-700 dark:text-violet-400 flex items-center gap-2">
            ✏️ Упоминается в корпоративной ВИКИ
          </h3>
          <div className="flex flex-wrap gap-2">
            {relatedPages.map((p) => (
              <Link key={p.id} href={`/dashboard/wiki-pages/${p.id}`}
                className="px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-500/30 text-sm text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10">
                📄 {p.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Cross-link shortcut to wiki */}
      <div className="mt-4 flex justify-end">
        <Link href="/dashboard/wiki?section=corporate"
          className="text-xs text-gray-400 hover:text-violet-600 dark:hover:text-violet-400">
          ← Перейти в Корпоративную ВИКИ
        </Link>
      </div>

      {editing && (
        <NormDocumentModal
          doc={doc}
          categories={categories}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load(); }}
        />
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-400">{label}</div>
      <div className="font-medium text-gray-800 dark:text-gray-200">{value}</div>
    </div>
  );
}
