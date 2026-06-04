'use client';

import { useParams } from 'next/navigation';
import PriceItemEditor from '@/components/company/price/PriceItemEditor';

export default function PriceItemEditorPage() {
  const params = useParams();
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const itemId = raw && raw !== 'new' && !Number.isNaN(Number(raw)) ? Number(raw) : null;
  return <PriceItemEditor itemId={itemId} />;
}
