'use client';

import { Suspense } from 'react';
import WikiEditorPage from '../_editor';

export default function NewWikiPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Загрузка…</div>}>
      <WikiEditorPage pageId={null} />
    </Suspense>
  );
}
