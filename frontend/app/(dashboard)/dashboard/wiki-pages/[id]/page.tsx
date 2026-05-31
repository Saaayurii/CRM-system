'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import BlockEditor from '@/components/wiki/BlockEditor';
import { WikiPageDetail, fmtDate, fmtDateTime } from '@/lib/wiki/pages-constants';

const ADMIN_ROLES = [1, 2, 3];

export default function WikiPageViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const isAdmin = ADMIN_ROLES.includes(user?.roleId ?? 0);

  const [page, setPage] = useState<WikiPageDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<WikiPageDetail>(`/wiki-pages/${id}`);
      setPage(data);
    } catch {
      addToast('error', 'Страница не найдена');
      setPage(null);
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    if (Number.isFinite(id)) load();
  }, [id, load]);

  const remove = async () => {
    if (!page || !confirm(`Удалить страницу «${page.title}»?`)) return;
    try {
      await api.delete(`/wiki-pages/${page.id}`);
      addToast('success', 'Страница удалена');
      router.push('/dashboard/wiki-pages');
    } catch (e: any) {
      addToast('error', e?.response?.data?.message || 'Не удалось удалить');
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-4" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="px-4 sm:px-6 py-16 text-center text-gray-400">
        <p>Страница не найдена.</p>
        <Link href="/dashboard/wiki-pages" className="text-violet-600 hover:underline text-sm">← К списку</Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
      {/* Top nav */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/dashboard/wiki?section=corporate" className="hover:text-violet-600">← Корпоративная ВИКИ</Link>
          {page.parentPage && (
            <>
              <span>/</span>
              <Link href={`/dashboard/wiki-pages/${page.parentPage.id}`} className="hover:text-violet-600">
                {page.parentPage.title}
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard/wiki-pages/${page.id}/edit`)}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {isAdmin ? '✏️ Редактировать' : '✏️ Предложить изменения'}
          </button>
          {isAdmin && (
            <button onClick={remove} className="px-3 py-1.5 rounded-lg text-sm text-red-600 border border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10">
              Удалить
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6">
        {/* Title */}
        <h1 className="text-3xl font-bold mb-3">{page.title}</h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 pb-4">
          {page.category && <span>🗂 {page.category}</span>}
          <span>Версия {page.version ?? 1}</span>
          <span>👁 {page.viewCount ?? 0}</span>
          <span>Обновлено: {fmtDate(page.updatedAt)}</span>
          {(page.tags as string[] || []).map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800">#{t}</span>
          ))}
        </div>

        {/* Content */}
        <div className="mt-4">
          {page.blocks && (page.blocks as any[]).length > 0 ? (
            <BlockEditor blocks={page.blocks as any} onChange={() => {}} readOnly />
          ) : page.content ? (
            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{page.content}</div>
          ) : (
            <p className="text-gray-400 italic">Страница пуста.</p>
          )}
        </div>
      </div>

      {/* Child pages */}
      {(page.childPages || []).length > 0 && (
        <div className="mt-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-3 text-gray-500">Подстраницы</h3>
          <div className="flex flex-wrap gap-2">
            {page.childPages!.map((child) => (
              <Link
                key={child.id}
                href={`/dashboard/wiki-pages/${child.id}`}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:border-violet-300 dark:hover:border-violet-500/50"
              >
                📄 {child.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
