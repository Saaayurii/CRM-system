'use client';

import { Suspense } from 'react';
import WikiEditorPage from '../_editor';
import { useT } from '@/lib/i18n';

export default function NewWikiPage() {
  const t = useT();
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">{t('Загрузка…')}</div>}>
      <WikiEditorPage pageId={null} />
    </Suspense>
  );
}
