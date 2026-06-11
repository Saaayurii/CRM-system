'use client';

/**
 * Passport section — "Фото узлов и оборудования".
 *
 * Reuses `ctx.site.photos` (string[]) as the source of truth; uploads go through
 * `ctx.uploadFile` and the list is persisted via `ctx.saveCore({ photos })`.
 */

import React, { useRef, useState } from 'react';
import type { PassportCtx } from '../usePassport';
import {
  Card, SectionHeader, GhostBtn, EmptyState, FileIcon, TrashIcon,
} from '../primitives';
import { useT } from '@/lib/i18n';

function isImageUrl(url: string): boolean {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/.test(clean);
}

function fileName(url: string): string {
  const clean = url.split('?')[0].split('#')[0];
  const parts = clean.split('/');
  return decodeURIComponent(parts[parts.length - 1] || url);
}

export default function PhotosSection({ ctx }: { ctx: PassportCtx }) {
  const t = useT();
  const photos: string[] = Array.isArray(ctx.site?.photos) ? ctx.site!.photos! : [];
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await ctx.uploadFile(file);
        if (url) urls.push(url);
      }
      if (urls.length) {
        const existing = Array.isArray(ctx.site?.photos) ? ctx.site!.photos! : [];
        await ctx.saveCore({ photos: [...existing, ...urls] });
      }
    } catch {
      /* toast handled in ctx */
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removePhoto = async (url: string) => {
    setBusy(true);
    try {
      const existing = Array.isArray(ctx.site?.photos) ? ctx.site!.photos! : [];
      await ctx.saveCore({ photos: existing.filter((p) => p !== url) });
    } catch {
      /* toast handled in ctx */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t('Фото узлов и оборудования')}
        subtitle={t('Счётчики, щиты, котёл, роутер и др.')}
        right={
          <GhostBtn onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? 'Загрузка...' : 'Загрузить'}
          </GhostBtn>
        }
      />

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      <Card title={`Галерея (${photos.length})`}>
        {photos.length === 0 ? (
          <EmptyState text="Фото и файлы ещё не загружены" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((url, i) => (
              <div key={`${url}-${i}`} className="group relative rounded-lg border border-gray-100 dark:border-gray-700/60 overflow-hidden bg-gray-50 dark:bg-gray-900/30">
                <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                  {isImageUrl(url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={fileName(url)} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="w-full h-36 flex flex-col items-center justify-center gap-2 text-gray-400 p-3">
                      <FileIcon className="w-8 h-8" />
                      <span className="text-xs text-center truncate w-full">{fileName(url)}</span>
                    </div>
                  )}
                </a>
                <button
                  type="button"
                  onClick={() => removePhoto(url)}
                  disabled={busy}
                  title={t('Удалить')}
                  className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all disabled:opacity-50"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
