'use client';

import { useEffect, useState, useCallback } from 'react';
import { normalizeFileUrl } from '@/lib/utils';

interface FilePreviewModalProps {
  fileUrl: string;
  fileName?: string;
  onClose: () => void;
}

type PreviewState =
  | { kind: 'loading' }
  | { kind: 'pdf'; url: string }
  | { kind: 'image'; url: string }
  | { kind: 'video'; url: string }
  | { kind: 'audio'; url: string }
  | { kind: 'html'; content: string }
  | { kind: 'text'; content: string }
  | { kind: 'office'; viewerUrl: string }
  | { kind: 'unsupported'; ext: string }
  | { kind: 'error'; message: string };

function getExt(url: string): string {
  const clean = (url || '').split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot !== -1 ? clean.slice(dot + 1).toLowerCase() : '';
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'tiff', 'tif'];
const VIDEO_EXTS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogv', 'm4v', 'flv'];
const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'opus', 'wma'];
const TEXT_EXTS  = ['txt', 'log', 'md', 'json', 'xml', 'yaml', 'yml', 'ini', 'env', 'sh', 'bat', 'py', 'js', 'ts', 'jsx', 'tsx', 'css', 'html', 'htm', 'sql'];
// Formats handled via Google Docs Viewer (needs public URL)
const OFFICE_VIEWER_EXTS = ['ppt', 'pptx', 'odp', 'odt', 'ods', 'rtf'];

export default function FilePreviewModal({ fileUrl, fileName, onClose }: FilePreviewModalProps) {
  const [state, setState] = useState<PreviewState>({ kind: 'loading' });

  const load = useCallback(async () => {
    const url = normalizeFileUrl(fileUrl);
    if (!url) { setState({ kind: 'error', message: 'Файл не найден' }); return; }

    const ext = getExt(url);

    if (ext === 'pdf') { setState({ kind: 'pdf', url }); return; }
    if (IMAGE_EXTS.includes(ext)) { setState({ kind: 'image', url }); return; }
    if (VIDEO_EXTS.includes(ext)) { setState({ kind: 'video', url }); return; }
    if (AUDIO_EXTS.includes(ext)) { setState({ kind: 'audio', url }); return; }

    if (TEXT_EXTS.includes(ext)) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setState({ kind: 'text', content: await res.text() });
      } catch (e: any) { setState({ kind: 'error', message: e.message }); }
      return;
    }

    // CSV — render as table via xlsx
    if (ext === 'csv') {
      try {
        const XLSX = await import('xlsx');
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const html = XLSX.utils.sheet_to_html(wb.Sheets[wb.SheetNames[0]], { id: 'xlsx-table' });
        setState({ kind: 'html', content: html });
      } catch (e: any) { setState({ kind: 'error', message: e.message }); }
      return;
    }

    // DOCX and DOC — mammoth
    if (ext === 'docx' || ext === 'doc') {
      try {
        const mammoth = (await import('mammoth')).default;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        setState({ kind: 'html', content: result.value });
      } catch (e: any) {
        // DOC may fail mammoth — fall through to office viewer
        if (ext === 'doc') {
          tryOfficeViewer(url, ext, setState);
        } else {
          setState({ kind: 'error', message: `Не удалось открыть файл: ${e.message}` });
        }
      }
      return;
    }

    // XLSX and XLS — xlsx library
    if (ext === 'xlsx' || ext === 'xls') {
      try {
        const XLSX = await import('xlsx');
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const html = XLSX.utils.sheet_to_html(wb.Sheets[wb.SheetNames[0]], { id: 'xlsx-table' });
        setState({ kind: 'html', content: html });
      } catch (e: any) { setState({ kind: 'error', message: `Не удалось открыть таблицу: ${e.message}` }); }
      return;
    }

    // Office formats — Google Docs Viewer
    if (OFFICE_VIEWER_EXTS.includes(ext)) {
      tryOfficeViewer(url, ext, setState);
      return;
    }

    setState({ kind: 'unsupported', ext: ext || 'неизвестный' });
  }, [fileUrl]);

  useEffect(() => { setState({ kind: 'loading' }); load(); }, [load]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const displayName = fileName || (fileUrl || '').split('/').pop() || 'Файл';
  const downloadUrl = normalizeFileUrl(fileUrl || '') || fileUrl || '';
  const ext = getExt(fileUrl);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 flex flex-col h-full max-w-5xl w-full mx-auto my-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileIcon ext={ext} />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{displayName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href={downloadUrl} download={displayName}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-500 hover:bg-violet-600 text-white transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Скачать
            </a>
            <button onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {state.kind === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-sm">Загрузка предпросмотра...</span>
              </div>
            </div>
          )}

          {state.kind === 'pdf' && (
            <iframe src={`${state.url}#toolbar=1&navpanes=0`} className="w-full h-full border-0" title={displayName} />
          )}

          {state.kind === 'image' && (
            <div className="absolute inset-0 flex items-center justify-center p-4 overflow-auto bg-gray-50 dark:bg-gray-950">
              <img src={state.url} alt={displayName} className="max-w-full max-h-full object-contain rounded shadow-lg" />
            </div>
          )}

          {state.kind === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black p-4">
              <video src={state.url} controls className="max-w-full max-h-full rounded-lg" style={{ maxHeight: '100%' }} />
            </div>
          )}

          {state.kind === 'audio' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <svg className="w-10 h-10 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{displayName}</p>
              <audio src={state.url} controls className="w-full max-w-md" />
            </div>
          )}

          {state.kind === 'html' && (
            <div className="absolute inset-0 overflow-auto p-6">
              <div
                className="prose prose-sm dark:prose-invert max-w-none [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1 [&_td]:text-xs [&_th]:border [&_th]:border-gray-300 [&_th]:px-2 [&_th]:py-1 [&_th]:text-xs [&_th]:bg-gray-100 dark:[&_th]:bg-gray-800 [&_table]:text-gray-800 dark:[&_table]:text-gray-200"
                dangerouslySetInnerHTML={{ __html: state.content }}
              />
            </div>
          )}

          {state.kind === 'text' && (
            <div className="absolute inset-0 overflow-auto p-4">
              <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                {state.content}
              </pre>
            </div>
          )}

          {state.kind === 'office' && (
            <iframe src={state.viewerUrl} className="w-full h-full border-0" title={displayName}
              onError={() => setState({ kind: 'unsupported', ext })} />
          )}

          {state.kind === 'unsupported' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-700 dark:text-gray-300">Предпросмотр недоступен</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Формат <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">.{state.ext}</span> не поддерживается для предпросмотра
                </p>
              </div>
              <a href={downloadUrl} download={displayName}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Скачать файл
              </a>
            </div>
          )}

          {state.kind === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8">
              <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-700 dark:text-gray-300">Ошибка загрузки</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{state.message}</p>
              </div>
              <a href={downloadUrl} download={displayName}
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors">
                Скачать файл
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function tryOfficeViewer(
  url: string,
  ext: string,
  setState: (s: PreviewState) => void
) {
  // Build absolute URL for Google Docs Viewer (requires public access)
  let absoluteUrl = url;
  if (typeof window !== 'undefined' && !url.startsWith('http')) {
    absoluteUrl = `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(absoluteUrl)}&embedded=true`;
  setState({ kind: 'office', viewerUrl });
}

export function FileIcon({ ext }: { ext: string }) {
  const MAP: Record<string, { bg: string; text: string; label: string }> = {
    pdf:  { bg: 'bg-red-100 dark:bg-red-900/40',    text: 'text-red-600 dark:text-red-400',    label: 'PDF'  },
    doc:  { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-600 dark:text-blue-400',   label: 'DOC'  },
    docx: { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-600 dark:text-blue-400',   label: 'DOCX' },
    xls:  { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-600 dark:text-green-400', label: 'XLS'  },
    xlsx: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-600 dark:text-green-400', label: 'XLSX' },
    csv:  { bg: 'bg-teal-100 dark:bg-teal-900/40',   text: 'text-teal-600 dark:text-teal-400',   label: 'CSV'  },
    ppt:  { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-600 dark:text-orange-400', label: 'PPT'  },
    pptx: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-600 dark:text-orange-400', label: 'PPTX' },
    odt:  { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-600 dark:text-blue-400',   label: 'ODT'  },
    ods:  { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-600 dark:text-green-400', label: 'ODS'  },
    odp:  { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-600 dark:text-orange-400', label: 'ODP'  },
    rtf:  { bg: 'bg-gray-100 dark:bg-gray-700',      text: 'text-gray-600 dark:text-gray-300',   label: 'RTF'  },
    txt:  { bg: 'bg-gray-100 dark:bg-gray-700',      text: 'text-gray-500 dark:text-gray-400',   label: 'TXT'  },
    zip:  { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-600 dark:text-yellow-400', label: 'ZIP'  },
    rar:  { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-600 dark:text-yellow-400', label: 'RAR'  },
    '7z': { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-600 dark:text-yellow-400', label: '7Z'   },
    mp4:  { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-600 dark:text-purple-400', label: 'MP4'  },
    mp3:  { bg: 'bg-pink-100 dark:bg-pink-900/40',   text: 'text-pink-600 dark:text-pink-400',   label: 'MP3'  },
    jpg:  { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-600 dark:text-violet-400', label: 'IMG'  },
    jpeg: { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-600 dark:text-violet-400', label: 'IMG'  },
    png:  { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-600 dark:text-violet-400', label: 'IMG'  },
  };
  const cfg = MAP[ext] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-400', label: (ext?.slice(0, 4).toUpperCase() || 'FILE') };
  return (
    <div className={`w-7 h-7 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </div>
  );
}
