'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import WikiEditorPage from '../../_editor';

export default function EditWikiPage() {
  const params = useParams();
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Загрузка…</div>}>
      <WikiEditorPage pageId={Number(params?.id) || null} />
    </Suspense>
  );
}
