'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useT } from '@/lib/i18n';
import Badge, { INSPECTION_STATUS, DEFECT_STATUS, DEFECT_SEVERITY, CHECK_STATUS } from '@/components/technadzor/Badge';

interface Defect {
  id: number; defectNumber?: string; title: string; status?: number; severity?: number;
}
interface ChecklistResult { id: number; results?: Array<{ key?: string; status?: string }>; }
interface Inspection {
  id: number;
  inspectionNumber?: string;
  inspectionType?: string;
  inspectorId?: number;
  projectId?: number;
  constructionSiteId?: number;
  status?: number;
  scheduledDate?: string;
  actualDate?: string;
  inspectionArea?: string;
  description?: string;
  findings?: string;
  recommendations?: string;
  score?: number;
  checklistResults?: ChecklistResult[];
  defects?: Defect[];
  createdAt?: string;
}

const fmtDate = (v?: string) => {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ru-RU');
};

const INSPECTION_TYPE_LABEL: Record<string, string> = {
  quality: 'Качество', safety: 'Безопасность', compliance: 'Соответствие', routine: 'Плановая',
};
const typeLabel = (v?: string) => (v ? INSPECTION_TYPE_LABEL[v] ?? v : '');

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">{t(label)}</div>
      <div className="text-sm text-gray-800 dark:text-gray-100">{children}</div>
    </div>
  );
}

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const t = useT();
  const [insp, setInsp] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('');
  const [inspectorName, setInspectorName] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Inspection>(`/inspections/${id}`);
      setInsp(data);
      // Подтягиваем человекочитаемые имена связей (мягко, без падений)
      if (data.projectId) {
        api.get(`/projects/${data.projectId}`).then((r) => setProjectName(r.data?.name || '')).catch(() => {});
      }
      if (data.constructionSiteId) {
        api.get(`/construction-sites/${data.constructionSiteId}`)
          .then((r) => setSiteName(r.data?.name || r.data?.address || '')).catch(() => {});
      }
      if (data.inspectorId) {
        api.get(`/users/${data.inspectorId}`)
          .then((r) => {
            const u = r.data || {};
            setInspectorName([u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email || '');
          }).catch(() => {});
      }
    } catch {
      setInsp(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        <div className="animate-pulse h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  if (!insp) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        <p className="text-gray-500 dark:text-gray-400">{t('Инспекция не найдена')}</p>
        <Link href="/dashboard/technadzor/inspections" className="text-violet-500 hover:text-violet-600 text-sm">← {t('К списку инспекций')}</Link>
      </div>
    );
  }

  const st = INSPECTION_STATUS[insp.status ?? 0] ?? INSPECTION_STATUS[0];
  const results = insp.checklistResults?.[0]?.results ?? [];
  const counts = { pass: 0, remark: 0, fail: 0, none: 0 } as Record<string, number>;
  for (const r of results) counts[r.status ?? 'none'] = (counts[r.status ?? 'none'] ?? 0) + 1;
  const checked = counts.pass + counts.remark + counts.fail;
  const total = results.length;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
        <Link href="/dashboard/technadzor" className="text-violet-500 hover:text-violet-600">{t('Технадзор')}</Link>
        <span>›</span>
        <Link href="/dashboard/technadzor/inspections" className="text-violet-500 hover:text-violet-600">{t('Мои инспекции')}</Link>
        <span>›</span>
        <span className="text-gray-700 dark:text-gray-200">{insp.inspectionNumber || `#${insp.id}`}</span>
      </nav>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{insp.inspectionNumber || `INSP-${insp.id}`}</h1>
            <Badge label={t(st.label)} color={st.color} />
            {insp.inspectionType && <Badge label={typeLabel(insp.inspectionType)} color="violet" />}
          </div>
          {insp.inspectionArea && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{insp.inspectionArea}</p>}
        </div>
        <Link
          href={`/dashboard/technadzor/inspections/${insp.id}/conduct`}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white"
        >
          {t('Провести инспекцию')}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Прогресс */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('Прогресс проверки')}</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">{checked} / {total || '—'}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden mb-4">
              <div className="h-full bg-violet-500" style={{ width: total ? `${(checked / total) * 100}%` : '0%' }} />
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              {(['pass', 'remark', 'fail', 'none'] as const).map((k) => (
                <div key={k} className="rounded-xl bg-gray-50 dark:bg-gray-900/40 py-3">
                  <div className="text-xl font-bold text-gray-800 dark:text-gray-100">{counts[k]}</div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">{t(CHECK_STATUS[k].label)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Описание/выводы */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{t('Описание')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{insp.description || t('Не указано')}</p>
            </div>
            {insp.findings && (
              <div><h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('Выводы')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{insp.findings}</p></div>
            )}
            {insp.recommendations && (
              <div><h4 className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('Рекомендации')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{insp.recommendations}</p></div>
            )}
          </div>

          {/* Дефекты */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Дефекты')} ({insp.defects?.length ?? 0})</h3>
            {insp.defects && insp.defects.length > 0 ? (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {insp.defects.map((d) => (
                  <li key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                    <Link href={`/dashboard/technadzor/defects/${d.id}`} className="text-sm text-violet-600 dark:text-violet-400 hover:underline truncate">
                      {d.defectNumber || `DEF-${d.id}`} — {d.title}
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      {d.severity != null && DEFECT_SEVERITY[d.severity] && <Badge label={t(DEFECT_SEVERITY[d.severity].label)} color={DEFECT_SEVERITY[d.severity].color} />}
                      <Badge label={t((DEFECT_STATUS[d.status ?? 0] ?? DEFECT_STATUS[0]).label)} color={(DEFECT_STATUS[d.status ?? 0] ?? DEFECT_STATUS[0]).color} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">{t('Дефекты не зафиксированы')}</p>
            )}
          </div>
        </div>

        {/* Правая колонка */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs grid grid-cols-2 gap-4">
            <Field label="Тип">{typeLabel(insp.inspectionType) || '—'}</Field>
            <Field label="Инспектор">{inspectorName || (insp.inspectorId ? `#${insp.inspectorId}` : '—')}</Field>
            <Field label="Дата (план)">{fmtDate(insp.scheduledDate)}</Field>
            <Field label="Дата (факт)">{fmtDate(insp.actualDate)}</Field>
            <Field label="Оценка">{insp.score != null ? insp.score : '—'}</Field>
            <Field label="Создана">{fmtDate(insp.createdAt)}</Field>
          </div>
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Связи')}</h3>
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              {insp.projectId ? (
                <Link href={`/dashboard/projects/${insp.projectId}`} className="block hover:text-violet-600 dark:hover:text-violet-400">🏢 {projectName || `${t('Проект')} #${insp.projectId}`}</Link>
              ) : <p>{t('Проект не привязан')}</p>}
              {insp.constructionSiteId ? <p>📍 {siteName || `${t('Объект')} #${insp.constructionSiteId}`}</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
