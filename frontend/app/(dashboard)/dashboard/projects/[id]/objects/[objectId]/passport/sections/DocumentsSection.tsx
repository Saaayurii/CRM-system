'use client';

/**
 * Passport section — "Документы и файлы".
 *
 * Reuses the documents-service (`/documents`) instead of the passport JSONB.
 * Layout mirrors the mockup: stat tiles, a category sidebar, the documents
 * table, and a "files by type" donut.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import type { PassportCtx } from '../usePassport';
import {
  Card, SectionHeader, Stat, PrimaryBtn, GhostBtn, IconBtn, EmptyState, Donut,
  TextInput, Select, FileIcon, TrashIcon, PlusIcon,
} from '../primitives';

/* ───────────────────────── types & helpers ───────────────────────── */

interface DocItem {
  id: number;
  title: string;
  documentType?: string;
  fileUrl?: string;
  status?: string;
  createdAt?: string;
}

const DOC_TYPE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'project', label: 'Проектная документация' },
  { value: 'contract', label: 'Договор' },
  { value: 'act', label: 'Акт' },
  { value: 'instruction', label: 'Инструкция' },
  { value: 'scheme', label: 'Схема' },
  { value: 'other', label: 'Прочее' },
];
const DOC_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  DOC_TYPE_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]),
);

const EXT_COLORS = ['#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9', '#ec4899', '#14b8a6', '#a3a3a3'];

function typeLabel(t?: string): string {
  if (!t) return 'Без категории';
  return DOC_TYPE_LABEL[t] || t;
}

function fileExt(url?: string): string {
  if (!url) return '—';
  const clean = url.split('?')[0].split('#')[0];
  const m = clean.match(/\.([a-zA-Z0-9]{1,6})$/);
  return m ? m[1].toUpperCase() : 'FILE';
}

function fmtDate(d?: string): string {
  if (!d) return '—';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ru-RU');
}

/** Absolute URL (Office viewer & blob download need a fully-qualified URL). */
function absUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === 'undefined') return url;
  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

type ViewerKind = 'image' | 'pdf' | 'office' | 'text' | 'none';
function viewerKind(url?: string): ViewerKind {
  const ext = url ? fileExt(url).toLowerCase() : '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'office';
  if (['txt', 'csv', 'log', 'json', 'xml'].includes(ext)) return 'text';
  return 'none';
}

const EyeIcon = (p: { className?: string }) => <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const DownloadIcon = (p: { className?: string }) => <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-6L12 15m0 0l4.5-4.5M12 15V3" /></svg>;
const CloseIcon = (p: { className?: string }) => <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

/* ───────────────────────── component ───────────────────────── */

export default function DocumentsSection({ ctx, onCountChange }: { ctx: PassportCtx; onCountChange: (n: number) => void }) {
  const addToast = useToastStore((s) => s.addToast);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('__all__');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<DocItem | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  // form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/documents', { params: { constructionSiteId: ctx.objectId, limit: 200 } });
      const arr: DocItem[] = Array.isArray(r.data?.data)
        ? r.data.data
        : (Array.isArray(r.data?.documents) ? r.data.documents : (Array.isArray(r.data) ? r.data : []));
      setDocs(arr);
      onCountChange(arr.length);
    } catch {
      addToast('error', 'Не удалось загрузить документы');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.objectId]);

  useEffect(() => { load(); }, [load]);

  /* derived: categories */
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of docs) {
      const key = d.documentType || '';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([value, count]) => ({ value, count }));
  }, [docs]);

  /* derived: file-extension distribution */
  const extDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of docs) {
      if (!d.fileUrl) continue;
      const ext = fileExt(d.fileUrl);
      counts.set(ext, (counts.get(ext) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: EXT_COLORS[i % EXT_COLORS.length] }));
  }, [docs]);

  /* derived: filtered + sorted list */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs
      .filter((d) => activeCategory === '__all__' || (d.documentType || '') === activeCategory)
      .filter((d) => !q || (d.title || '').toLowerCase().includes(q))
      .slice()
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
  }, [docs, activeCategory, search]);

  const filesCount = useMemo(() => docs.filter((d) => d.fileUrl).length, [docs]);

  /* actions */
  const openForm = () => { setTitle(''); setDocType(''); setFile(null); setShowForm(true); };
  const cancel = () => { setShowForm(false); setTitle(''); setDocType(''); setFile(null); if (fileRef.current) fileRef.current.value = ''; };

  const save = async () => {
    if (!title.trim()) { addToast('error', 'Укажите название документа'); return; }
    setSaving(true);
    try {
      let fileUrl: string | undefined;
      if (file) {
        fileUrl = await ctx.uploadFile(file);
        if (!fileUrl) throw new Error('upload failed');
      }
      await api.post('/documents', {
        title: title.trim(),
        documentType: docType || undefined,
        fileUrl,
        projectId: ctx.projectId,
        constructionSiteId: ctx.objectId,
        status: 'active',
      });
      addToast('success', 'Документ добавлен');
      cancel();
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg.join('; ') : (msg || 'Ошибка при сохранении'));
    } finally {
      setSaving(false);
    }
  };

  const download = async (d: DocItem) => {
    if (!d.fileUrl) return;
    setDownloading(d.id);
    const url = absUrl(d.fileUrl);
    const ext = fileExt(d.fileUrl).toLowerCase();
    const name = /\.[a-z0-9]{1,6}$/i.test(d.title) ? d.title : `${d.title || 'document'}.${ext}`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed');
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      // Cross-origin or network issue — fall back to opening in a new tab.
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(null);
    }
  };

  const remove = async (d: DocItem) => {
    if (!confirm(`Удалить документ «${d.title}»?`)) return;
    try {
      await api.delete(`/documents/${d.id}`);
      addToast('success', 'Документ удалён');
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      addToast('error', Array.isArray(msg) ? msg.join('; ') : (msg || 'Ошибка при удалении'));
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Документы и файлы"
        subtitle="Проекты, договоры, акты, инструкции"
        right={!showForm ? <PrimaryBtn onClick={openForm}><PlusIcon className="w-4 h-4" />Добавить документ</PrimaryBtn> : undefined}
      />

      {/* stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Stat label="Всего документов" value={docs.length} icon={<FileIcon className="w-6 h-6" />} />
        <Stat label="Файлов" value={filesCount} accent="text-green-500" icon={<FileIcon className="w-6 h-6" />} />
        <Stat label="Категорий" value={categories.length} accent="text-orange-500" icon={<FileIcon className="w-6 h-6" />} />
      </div>

      {showForm && (
        <Card title="Новый документ">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput label="Название *" value={title} onChange={setTitle} placeholder="Название документа" />
            <Select label="Категория" value={docType} onChange={setDocType} options={DOC_TYPE_OPTIONS} />
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Файл</label>
              <div className="flex items-center gap-2">
                <GhostBtn onClick={() => fileRef.current?.click()}>
                  {file ? 'Заменить файл' : 'Выбрать файл'}
                </GhostBtn>
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{file?.name || 'Файл не выбран'}</span>
              </div>
              <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-4">
            <GhostBtn onClick={cancel} disabled={saving}>Отмена</GhostBtn>
            <PrimaryBtn onClick={save} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</PrimaryBtn>
          </div>
        </Card>
      )}

      {loading ? (
        <Card><div className="flex items-center justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" /></div></Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr_280px] gap-5">
          {/* categories */}
          <Card title="Категории">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveCategory('__all__')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${activeCategory === '__all__' ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/30'}`}
              >
                <span>Все</span>
                <span className="text-xs text-gray-400 tabular-nums">{docs.length}</span>
              </button>
              {categories.map((c) => (
                <button
                  key={c.value || '__none__'}
                  type="button"
                  onClick={() => setActiveCategory(c.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${activeCategory === c.value ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/30'}`}
                >
                  <span className="truncate text-left">{typeLabel(c.value)}</span>
                  <span className="text-xs text-gray-400 tabular-nums shrink-0">{c.count}</span>
                </button>
              ))}
              {categories.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">Нет категорий</p>}
            </div>
          </Card>

          {/* documents list */}
          <Card title="Все документы">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <TextInput value={search} onChange={setSearch} placeholder="Поиск по названию..." className="flex-1 min-w-[160px]" />
              <Select
                value={activeCategory === '__all__' ? '' : activeCategory}
                onChange={(v) => setActiveCategory(v || '__all__')}
                options={[{ value: '', label: 'Все категории' }, ...categories.map((c) => ({ value: c.value, label: typeLabel(c.value) }))]}
                className="min-w-[160px]"
              />
            </div>
            {filtered.length === 0 ? (
              <EmptyState text={docs.length === 0 ? 'Документы ещё не добавлены' : 'Ничего не найдено'} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 pr-3 text-left font-semibold">Название</th>
                      <th className="py-2 pr-3 text-left font-semibold">Категория</th>
                      <th className="py-2 pr-3 text-left font-semibold">Тип</th>
                      <th className="py-2 pr-3 text-left font-semibold">Дата добавления</th>
                      <th className="py-2 text-right font-semibold w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/40">
                    {filtered.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                        <td className="py-2 pr-3 font-medium text-gray-800 dark:text-gray-100 align-top">{d.title}</td>
                        <td className="py-2 pr-3 text-gray-600 dark:text-gray-300 align-top">{typeLabel(d.documentType)}</td>
                        <td className="py-2 pr-3 text-gray-500 dark:text-gray-400 align-top">{d.fileUrl ? fileExt(d.fileUrl) : '—'}</td>
                        <td className="py-2 pr-3 text-gray-500 dark:text-gray-400 align-top">{fmtDate(d.createdAt)}</td>
                        <td className="py-2 align-top">
                          <div className="flex items-center justify-end gap-1">
                            {d.fileUrl && (
                              <IconBtn title="Просмотр" onClick={() => setPreview(d)}><EyeIcon className="w-4 h-4" /></IconBtn>
                            )}
                            {d.fileUrl && (
                              <button type="button" title="Скачать" disabled={downloading === d.id} onClick={() => download(d)}
                                className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors disabled:opacity-50">
                                {downloading === d.id
                                  ? <span className="block w-4 h-4 animate-spin rounded-full border-b-2 border-violet-500" />
                                  : <DownloadIcon className="w-4 h-4" />}
                              </button>
                            )}
                            <IconBtn danger title="Удалить" onClick={() => remove(d)}><TrashIcon className="w-4 h-4" /></IconBtn>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* files by type */}
          <Card title="Файлы по типам">
            {extDistribution.length === 0 ? (
              <EmptyState text="Нет файлов" />
            ) : (
              <Donut data={extDistribution} />
            )}
          </Card>
        </div>
      )}

      {/* Document preview modal */}
      {preview && preview.fileUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setPreview(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-700/60">
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{preview.title}</p>
                <p className="text-xs text-gray-400">{typeLabel(preview.documentType)} · {fileExt(preview.fileUrl)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => download(preview)} disabled={downloading === preview.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  <DownloadIcon className="w-4 h-4" />Скачать
                </button>
                <a href={absUrl(preview.fileUrl)} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-violet-400 transition-colors">
                  Открыть
                </a>
                <IconBtn title="Закрыть" onClick={() => setPreview(null)}><CloseIcon className="w-5 h-5" /></IconBtn>
              </div>
            </div>
            <div className="flex-1 min-h-0 bg-gray-50 dark:bg-gray-900/40">
              {(() => {
                const kind = viewerKind(preview.fileUrl);
                const url = absUrl(preview.fileUrl!);
                if (kind === 'image') {
                  return (
                    <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={preview.title} className="max-w-full max-h-full object-contain" />
                    </div>
                  );
                }
                if (kind === 'pdf' || kind === 'text') {
                  return <iframe src={url} title={preview.title} className="w-full h-full border-0" />;
                }
                if (kind === 'office') {
                  return <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`} title={preview.title} className="w-full h-full border-0" />;
                }
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-400 px-6 text-center">
                    <FileIcon className="w-12 h-12" />
                    <p className="text-sm">Предпросмотр недоступен для этого типа файла.</p>
                    <button type="button" onClick={() => download(preview)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg">
                      <DownloadIcon className="w-4 h-4" />Скачать файл
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
