'use client';

import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
  name?: string;
}

interface MediaViewerProps {
  items: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

export default function MediaViewer({ items, initialIndex, onClose }: MediaViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [imageScale, setImageScale] = useState(1);
  const [loaded, setLoaded] = useState(false);

  const current = items[index];
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  const prev = useCallback(() => {
    if (hasPrev) { setIndex((i) => i - 1); setImageScale(1); setLoaded(false); }
  }, [hasPrev]);

  const next = useCallback(() => {
    if (hasNext) { setIndex((i) => i + 1); setImageScale(1); setLoaded(false); }
  }, [hasNext]);

  useEffect(() => {
    setLoaded(false);
  }, [index]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose, prev, next]);

  const toggleZoom = () => {
    setImageScale((s) => (s === 1 ? 2 : 1));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-white/70 text-sm truncate max-w-[60%]">
          {current.name || ''}
        </span>
        <div className="flex items-center gap-2">
          {items.length > 1 && (
            <span className="text-white/50 text-sm">{index + 1} / {items.length}</span>
          )}
          {/* Download */}
          <a
            href={current.url}
            download={current.name}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Скачать"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
          </a>
          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Закрыть (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Prev arrow */}
      {hasPrev && (
        <button
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white bg-black/30 hover:bg-black/60 rounded-full transition-colors"
          onClick={(e) => { e.stopPropagation(); prev(); }}
          title="Назад (←)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Media content */}
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Spinner while loading */}
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {current.type === 'image' ? (
          <img
            src={current.url}
            alt={current.name}
            onLoad={() => setLoaded(true)}
            onClick={toggleZoom}
            className="rounded-lg object-contain transition-transform duration-300 select-none"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              transform: `scale(${imageScale})`,
              cursor: imageScale === 1 ? 'zoom-in' : 'zoom-out',
              opacity: loaded ? 1 : 0,
            }}
            draggable={false}
          />
        ) : (
          <video
            src={current.url}
            controls
            autoPlay
            onLoadedData={() => setLoaded(true)}
            className="rounded-lg"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              opacity: loaded ? 1 : 0,
            }}
          />
        )}
      </div>

      {/* Next arrow */}
      {hasNext && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 text-white/70 hover:text-white bg-black/30 hover:bg-black/60 rounded-full transition-colors"
          onClick={(e) => { e.stopPropagation(); next(); }}
          title="Вперёд (→)"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Thumbnails strip (if multiple media) */}
      {items.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-3 py-2 bg-black/50 rounded-xl backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { setIndex(i); setImageScale(1); setLoaded(false); }}
              className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                i === index ? 'border-violet-400 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              {item.type === 'image' ? (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-violet-900/60 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
