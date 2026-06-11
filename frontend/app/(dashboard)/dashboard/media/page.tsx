'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { normalizeFileUrl } from '@/lib/utils';
import MediaViewer, { MediaItem as ViewerItem } from '@/components/chat/MediaViewer';
import FilePreviewModal, { FileIcon } from '@/components/ui/FilePreviewModal';
import { useT } from '@/lib/i18n';

type MediaSource = 'chat' | 'document' | 'defect' | 'site';
type MediaKind = 'image' | 'video' | 'audio' | 'document';

interface MediaItem {
  id: string; // unique composite key
  source: MediaSource;
  kind: MediaKind;
  url: string;          // normalized
  fileName: string;
  mimeType?: string;
  fileSize?: number | null;
  createdAt?: string;
  // origin context
  contextLabel?: string; // e.g. channel name, project name, defect title
  contextHref?: string;  // link to source page
  uploaderName?: string;
  uploaderAvatarUrl?: string;
}

const IMG_EXT = /\.(jpe?g|png|gif|webp|bmp|svg|heic|avif|tiff?)(\?|$)/i;
const VIDEO_EXT = /\.(mp4|mov|avi|webm|mkv|m4v|3gp|ogv|flv)(\?|$)/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a|flac|aac|opus|wma)(\?|$)/i;

function detectKind(url: string | null | undefined, mimeType?: string | null): MediaKind {
  const mt = (mimeType || '').toLowerCase();
  if (mt.startsWith('image/')) return 'image';
  if (mt.startsWith('video/')) return 'video';
  if (mt.startsWith('audio/')) return 'audio';
  const u = url || '';
  if (IMG_EXT.test(u)) return 'image';
  if (VIDEO_EXT.test(u)) return 'video';
  if (AUDIO_EXT.test(u)) return 'audio';
  return 'document';
}

function basenameFromUrl(url: string): string {
  const clean = url.split('?')[0].split('#')[0];
  const parts = clean.split('/');
  return parts[parts.length - 1] || 'Файл';
}

function formatSize(bytes?: number | null): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

function getExt(url: string): string {
  const clean = (url || '').split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot !== -1 ? clean.slice(dot + 1).toLowerCase() : '';
}

const SOURCE_LABEL: Record<MediaSource, string> = {
  chat: 'Чат',
  document: 'Документы',
  defect: 'Дефекты',
  site: 'Проекты',
};

const SOURCE_COLOR: Record<MediaSource, string> = {
  chat: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  document: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  defect: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  site: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
};

const KIND_LABEL: Record<MediaKind, string> = {
  image: 'Изображения',
  video: 'Видео',
  audio: 'Аудио',
  document: 'Документы',
};

export default function MediaPage() {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<MediaKind | ''>('');
  const [sourceFilter, setSourceFilter] = useState<MediaSource | ''>('');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [viewerItems, setViewerItems] = useState<ViewerItem[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [previewFile, setPreviewFile] = useState<MediaItem | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [chatRes, docsRes, defectsRes, sitesRes] = await Promise.all([
        api.get('/chat-channels/media', { params: { page: 1, limit: 500 } }).catch(() => ({ data: { data: [] } })),
        api.get('/documents', { params: { page: 1, limit: 500 } }).catch(() => ({ data: { data: [] } })),
        api.get('/defects', { params: { page: 1, limit: 500 } }).catch(() => ({ data: { data: [] } })),
        api.get('/construction-sites', { params: { page: 1, limit: 500 } }).catch(() => ({ data: { data: [] } })),
      ]);

      const merged: MediaItem[] = [];

      // Chat attachments
      const chatList: any[] = chatRes.data?.data || [];
      for (const a of chatList) {
        const url = normalizeFileUrl(a.url);
        if (!url) continue;
        const fileName = a.fileName || basenameFromUrl(url);
        merged.push({
          id: `chat:${a.messageId}:${url}`,
          source: 'chat',
          kind: detectKind(url, a.mimeType),
          url,
          fileName,
          mimeType: a.mimeType || undefined,
          fileSize: a.fileSize || null,
          createdAt: a.createdAt,
          contextLabel: a.channelName || 'Чат',
          contextHref: a.channelId ? `/dashboard/chat?channelId=${a.channelId}` : '/dashboard/chat',
          uploaderName: a.userName || undefined,
          uploaderAvatarUrl: normalizeFileUrl(a.userAvatarUrl) || undefined,
        });
      }

      // Documents
      const docs: any[] = docsRes.data?.data || docsRes.data?.documents || [];
      for (const d of docs) {
        const url = normalizeFileUrl(d.fileUrl || d.file_url);
        if (!url) continue;
        merged.push({
          id: `document:${d.id}`,
          source: 'document',
          kind: detectKind(url, d.fileType || d.file_type),
          url,
          fileName: d.title || basenameFromUrl(url),
          mimeType: d.fileType || d.file_type || undefined,
          fileSize: d.fileSize || d.file_size || null,
          createdAt: d.createdAt,
          contextLabel: 'Документы',
          contextHref: '/dashboard/documents',
        });
      }

      // Defect photos
      const defects: any[] = defectsRes.data?.data || defectsRes.data?.defects || [];
      for (const def of defects) {
        const photos: any[] = Array.isArray(def.photos) ? def.photos : [];
        for (const p of photos) {
          const rawUrl = typeof p === 'string' ? p : (p?.url || p?.fileUrl);
          const url = normalizeFileUrl(rawUrl);
          if (!url) continue;
          const fileName = (typeof p === 'object' && p.fileName) || basenameFromUrl(url);
          merged.push({
            id: `defect:${def.id}:${url}`,
            source: 'defect',
            kind: detectKind(url, (typeof p === 'object' ? p.mimeType : undefined)),
            url,
            fileName,
            mimeType: typeof p === 'object' ? p.mimeType : undefined,
            createdAt: def.createdAt || def.reportedDate,
            contextLabel: def.title || `Дефект #${def.defectNumber || def.id}`,
            contextHref: '/dashboard/inspector/defects',
          });
        }
      }

      // Construction site photos
      const sites: any[] = sitesRes.data?.data || sitesRes.data?.constructionSites || sitesRes.data || [];
      for (const site of Array.isArray(sites) ? sites : []) {
        const photos: any[] = Array.isArray(site.photos) ? site.photos : [];
        for (const p of photos) {
          const rawUrl = typeof p === 'string' ? p : (p?.url || p?.fileUrl);
          const url = normalizeFileUrl(rawUrl);
          if (!url) continue;
          const fileName = (typeof p === 'object' && p.fileName) || basenameFromUrl(url);
          merged.push({
            id: `site:${site.id}:${url}`,
            source: 'site',
            kind: detectKind(url, (typeof p === 'object' ? p.mimeType : undefined)),
            url,
            fileName,
            mimeType: typeof p === 'object' ? p.mimeType : undefined,
            createdAt: site.updatedAt || site.createdAt,
            contextLabel: site.name || `Объект #${site.id}`,
            contextHref: site.projectId ? `/dashboard/projects/${site.projectId}` : '/dashboard/projects',
          });
        }
      }

      // Newest first
      merged.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      setItems(merged);
    } catch {
      addToast('error', 'Не удалось загрузить медиа');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (kindFilter && it.kind !== kindFilter) return false;
      if (sourceFilter && it.source !== sourceFilter) return false;
      if (q && !it.fileName.toLowerCase().includes(q) && !(it.contextLabel || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, kindFilter, sourceFilter, search]);

  // Build a media list (image + video only) for MediaViewer to navigate within
  const viewableMedia = useMemo(
    () => filtered.filter((it) => it.kind === 'image' || it.kind === 'video'),
    [filtered],
  );

  const openItem = (item: MediaItem) => {
    if (item.kind === 'image' || item.kind === 'video') {
      const idx = viewableMedia.findIndex((m) => m.id === item.id);
      const itemsForViewer: ViewerItem[] = viewableMedia.map((m) => ({
        url: m.url,
        type: m.kind === 'video' ? 'video' : 'image',
        name: m.fileName,
      }));
      setViewerItems(itemsForViewer);
      setViewerIndex(idx >= 0 ? idx : 0);
    } else {
      setPreviewFile(item);
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      // 1. Upload each file via existing chat-upload endpoint
      const form = new FormData();
      Array.from(fileList).forEach((f) => form.append('files', f));
      const uploadRes = await api.post('/chat-channels/upload', form);
      const uploaded: any[] = Array.isArray(uploadRes.data) ? uploadRes.data : [uploadRes.data];

      // 2. Create a Document record per file so it appears in the aggregation
      for (const u of uploaded) {
        const url = normalizeFileUrl(u.fileUrl || u.url);
        if (!url) continue;
        await api.post('/documents', {
          title: u.fileName || basenameFromUrl(url),
          documentType: 'other',
          fileUrl: url,
          fileSize: u.fileSize || null,
          fileType: u.mimeType || null,
          status: 'active',
          accessLevel: 'internal',
        });
      }
      addToast('success', `Загружено: ${uploaded.length}`);
      await fetchAll();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Ошибка при загрузке');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const counts = useMemo(() => {
    const byKind: Record<MediaKind, number> = { image: 0, video: 0, audio: 0, document: 0 };
    const bySource: Record<MediaSource, number> = { chat: 0, document: 0, defect: 0, site: 0 };
    for (const it of items) {
      byKind[it.kind]++;
      bySource[it.source]++;
    }
    return { byKind, bySource };
  }, [items]);

  return (
    <div>
      <div className="sm:flex sm:justify-between sm:items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">{t('Медиа')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Все файлы из чатов, документов, дефектов и объектов
          </p>
        </div>
        <div className="flex items-center gap-0.5 mt-3 sm:mt-0">
          <button
            onClick={() => { setShowSearch((v) => !v); setShowFilter(false); }}
            title={t('Поиск')}
            className={`p-2 rounded-lg transition-colors ${showSearch || search ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title={uploading ? 'Загрузка...' : 'Загрузить файлы'}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading
              ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
            }
          </button>
          <button
            onClick={() => { setShowFilter((v) => !v); setShowSearch(false); }}
            title={t('Фильтры')}
            className={`relative p-2 rounded-lg transition-colors ${showFilter || kindFilter || sourceFilter ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            {(kindFilter || sourceFilter) && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-violet-500" />}
          </button>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg ml-1">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''} transition-colors`} title={t('Сетка')}>
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''} transition-colors`} title={t('Список')}>
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Inline search */}
      {showSearch && (
        <div className="mb-3 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl px-4 py-2.5 shadow-xs border border-gray-100 dark:border-gray-700">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            autoFocus
            type="text"
            placeholder={t('Поиск по названию...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
      {/* Filter panel */}
      {showFilter && (
        <div className="mb-4 flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-xs border border-gray-100 dark:border-gray-700">
          <select value={kindFilter} onChange={(e) => setKindFilter((e.target.value as MediaKind) || '')} className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none">
            <option value="">{t('Все типы')}</option>
            {(Object.keys(KIND_LABEL) as MediaKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]} ({counts.byKind[k]})</option>)}
          </select>
          <select value={sourceFilter} onChange={(e) => setSourceFilter((e.target.value as MediaSource) || '')} className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none">
            <option value="">{t('Все источники')}</option>
            {(Object.keys(SOURCE_LABEL) as MediaSource[]).map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]} ({counts.bySource[s as MediaSource]})</option>)}
          </select>
          {(kindFilter || sourceFilter) && (
            <button onClick={() => { setKindFilter(''); setSourceFilter(''); }} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              Сбросить
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">{t('Загрузка...')}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            {items.length === 0 ? 'У вас пока нет доступных медиа' : 'Ничего не найдено'}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-4">
            {filtered.map((item) => (
              <MediaTile key={item.id} item={item} onOpen={() => openItem(item)} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3">{t('Файл')}</th>
                  <th className="px-4 py-3">{t('Источник')}</th>
                  <th className="px-4 py-3">{t('Размер')}</th>
                  <th className="px-4 py-3">{t('Дата')}</th>
                  <th className="px-4 py-3 text-center">{t('Действия')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                    onClick={() => openItem(item)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.kind === 'image' ? (
                          <img src={item.url} alt="" className="w-10 h-10 object-cover rounded shrink-0" />
                        ) : item.kind === 'video' ? (
                          <div className="w-10 h-10 rounded bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-violet-500" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        ) : (
                          <div className="shrink-0">
                            <FileIcon ext={getExt(item.url)} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{item.fileName}</p>
                          {item.contextLabel && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.contextLabel}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_COLOR[item.source]}`}>
                        {SOURCE_LABEL[item.source]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatSize(item.fileSize)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDateTime(item.createdAt) || '—'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openItem(item)}
                          className="p-1.5 text-violet-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded transition-colors"
                          title={t('Просмотр')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <a
                          href={item.url}
                          download={item.fileName}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 rounded transition-colors"
                          title={t('Скачать')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Media viewer for images/videos */}
      {viewerItems.length > 0 && (
        <MediaViewer
          items={viewerItems}
          initialIndex={viewerIndex}
          onClose={() => setViewerItems([])}
        />
      )}

      {/* File preview for documents */}
      {previewFile && (
        <FilePreviewModal
          fileUrl={previewFile.url}
          fileName={previewFile.fileName}
          mimeType={previewFile.mimeType}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}

function MediaTile({ item, onOpen }: { item: MediaItem; onOpen: () => void }) {
  const t = useT();
  const dateTime = formatDateTime(item.createdAt);
  return (
    <div className="group relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full aspect-square overflow-hidden focus:outline-none focus:ring-2 focus:ring-violet-400 relative"
      >
        {item.kind === 'image' ? (
          <img
            src={item.url}
            alt={item.fileName}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : item.kind === 'video' ? (
          <>
            {/* Use video element with metadata preload — most browsers show the first frame as poster */}
            <video
              src={`${item.url}#t=0.5`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              muted
              preload="metadata"
              playsInline
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </div>
          </>
        ) : item.kind === 'audio' ? (
          <div className="w-full h-full bg-gradient-to-br from-pink-100 to-pink-300 dark:from-pink-900/30 dark:to-pink-700/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="scale-[2]">
              <FileIcon ext={getExt(item.url)} />
            </div>
          </div>
        )}

        {/* Date/time badge in the bottom-left corner of the preview */}
        {dateTime && (
          <span className="absolute bottom-1.5 left-1.5 text-[10px] font-medium text-white bg-black/60 px-1.5 py-0.5 rounded">
            {dateTime}
          </span>
        )}
      </button>

      {/* Top overlay: source tag + download */}
      <div className="absolute inset-x-0 top-0 p-2 flex items-start justify-between pointer-events-none">
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${SOURCE_COLOR[item.source]} pointer-events-auto`}>
          {SOURCE_LABEL[item.source]}
        </span>
        <a
          href={item.url}
          download={item.fileName}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 pointer-events-auto p-1.5 rounded bg-black/60 hover:bg-black/80 text-white transition-opacity"
          title={t('Скачать')}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      </div>

      {/* Bottom info: filename + context */}
      <div className="px-2 py-1.5 text-xs">
        <p className="font-medium text-gray-800 dark:text-gray-100 truncate" title={item.fileName}>
          {item.fileName}
        </p>
        {item.contextLabel && (
          <p className="text-gray-500 dark:text-gray-400 truncate" title={item.contextLabel}>
            {item.contextLabel}
          </p>
        )}
      </div>
    </div>
  );
}
