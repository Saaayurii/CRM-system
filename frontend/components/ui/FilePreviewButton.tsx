'use client';

import { useState } from 'react';
import FilePreviewModal from './FilePreviewModal';
import { normalizeFileUrl } from '@/lib/utils';

interface FilePreviewButtonProps {
  fileUrl: string;
  fileName?: string;
}

export default function FilePreviewButton({ fileUrl, fileName }: FilePreviewButtonProps) {
  const [open, setOpen] = useState(false);
  const normalized = normalizeFileUrl(fileUrl);
  if (!normalized) return <span className="text-gray-400 text-sm">—</span>;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-violet-500 hover:text-violet-600 text-sm transition-colors"
        title="Открыть предпросмотр"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.964-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Просмотр
      </button>
      {open && (
        <FilePreviewModal
          fileUrl={fileUrl}
          fileName={fileName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
