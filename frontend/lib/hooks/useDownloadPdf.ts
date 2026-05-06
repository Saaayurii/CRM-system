'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

export function useDownloadPdf() {
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);

  const download = async (entityType: string, title: string, rows: Record<string, unknown>[]) => {
    if (loading || rows.length === 0) return;
    setLoading(true);
    try {
      const { data: gen } = await api.post('/documents/pdf/generate-list', { entityType, title, rows });
      const { data: blob } = await api.get(`/documents/pdf/download/${gen.filename}`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = gen.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'PDF скачан');
    } catch {
      addToast('error', 'Не удалось сформировать PDF');
    } finally {
      setLoading(false);
    }
  };

  return { download, loading };
}
