'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';
import { DEFECT_STATUS } from '@/components/technadzor/Badge';

interface InspectionLite { id: number; inspectionNumber?: string; inspectionType?: string; }
interface Defect { id: number; defectNumber?: string; title: string; status?: number; severity?: number; }

const fmtDate = (v?: string) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU');
};

export default function ReportsPage() {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [inspections, setInspections] = useState<InspectionLite[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.get('/inspections', { params: { limit: 200 } })
      .then(({ data }) => {
        const list: InspectionLite[] = data?.data || data?.items || (Array.isArray(data) ? data : []);
        setInspections(list);
        if (list.length) setSelected(list[0].id);
      })
      .catch(() => {});
  }, []);

  const generate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      // Подтягиваем инспекцию с дефектами для тела акта
      const { data: insp } = await api.get(`/inspections/${selected}`);
      const defects: Defect[] = Array.isArray(insp.defects) ? insp.defects : [];
      const defectsList = defects.length
        ? defects.map((d) => `• ${d.defectNumber || `DEF-${d.id}`}: ${d.title} (${t((DEFECT_STATUS[d.status ?? 0] ?? DEFECT_STATUS[0]).label)})`).join('\n')
        : 'Дефектов не выявлено';

      const entityData = {
        inspectionNumber: insp.inspectionNumber,
        inspectionType: insp.inspectionType,
        status: insp.status,
        inspectionArea: insp.inspectionArea,
        scheduledDate: insp.scheduledDate,
        actualDate: insp.actualDate,
        score: insp.score,
        description: insp.description,
        findings: insp.findings,
        recommendations: insp.recommendations,
        defectsCount: defects.length,
        defectsList,
      };

      // 1. Генерация PDF → filename
      const { data: gen } = await api.post('/documents/pdf/generate', {
        entityType: 'inspection',
        entityId: selected,
        entityData,
      });
      // 2. Скачивание blob с авторизацией
      const { data: blob } = await api.get(`/documents/pdf/download/${gen.filename}`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = gen.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'Акт осмотра сформирован');
    } catch {
      addToast('error', 'Не удалось сформировать отчёт');
    } finally {
      setGenerating(false);
    }
  };

  const sel = inspections.find((i) => i.id === selected);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
        <Link href="/dashboard/technadzor" className="text-violet-500 hover:text-violet-600">{t('Технадзор')}</Link>
        <span>›</span><span className="text-gray-700 dark:text-gray-200">{t('PDF отчёты')}</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-1">{t('PDF отчёты')}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('Генерация акта осмотра по инспекции')}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Шаблоны */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xs uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500">{t('Шаблон отчёта')}</h2>
          <div className="rounded-2xl border-2 border-violet-400 dark:border-violet-500/50 bg-white dark:bg-gray-800 p-5 shadow-xs">
            <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xl mb-3">📄</div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('Акт осмотра')}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('Акт осмотра объекта с перечнем выявленных дефектов')}</p>
          </div>
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-5 text-sm text-gray-400">
            {t('Другие шаблоны (отчёт технадзора, приёмка квартиры) — в разработке')}
          </div>
        </div>

        {/* Настройка */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500">{t('Настройка отчёта')}</h2>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
            <label className="block text-sm text-gray-600 dark:text-gray-300 mb-2">{t('Инспекция')}</label>
            <select
              value={selected ?? ''}
              onChange={(e) => setSelected(Number(e.target.value))}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100"
            >
              {inspections.length === 0 && <option value="">{t('Нет инспекций')}</option>}
              {inspections.map((i) => (
                <option key={i.id} value={i.id}>{i.inspectionNumber || `INSP-${i.id}`}{i.inspectionType ? ` — ${i.inspectionType}` : ''}</option>
              ))}
            </select>

            {sel && (
              <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-900/40 p-4 text-sm text-gray-600 dark:text-gray-300">
                {t('Будет сформирован акт осмотра по инспекции')} <b>{sel.inspectionNumber || `INSP-${sel.id}`}</b> {t('с перечнем выявленных дефектов.')}
              </div>
            )}

            <button
              onClick={generate}
              disabled={generating || !selected}
              className="mt-5 px-5 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 inline-flex items-center gap-2"
            >
              {generating ? t('Формирование…') : t('Сформировать отчёт')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
