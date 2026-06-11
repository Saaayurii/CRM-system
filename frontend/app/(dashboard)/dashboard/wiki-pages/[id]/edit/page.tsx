'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import WikiEditorPage from '../../_editor';
import { useT } from '@/lib/i18n';

export default function EditWikiPage() {
  const t = useT();
  const params = useParams();
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">{t('Загрузка…')}</div>}>
      <WikiEditorPage pageId={Number(params?.id) || null} />
    </Suspense>
  );
}
