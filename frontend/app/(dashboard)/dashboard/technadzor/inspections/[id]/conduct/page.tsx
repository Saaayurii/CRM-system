'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';
import { CHECK_STATUS } from '@/components/technadzor/Badge';

type CheckStatus = 'pass' | 'remark' | 'fail' | 'none';

interface Point { key: string; code?: string; name: string; required?: boolean; }
interface Section { title: string; points: Point[]; }
interface ResultEntry { key: string; code?: string; name?: string; status: CheckStatus; comment?: string; }

interface Inspection {
  id: number; inspectionNumber?: string; inspectionType?: string;
  projectId?: number; status?: number;
  checklistResults?: Array<{ checklistTemplateId?: number; results?: ResultEntry[] }>;
}
interface Template { id: number; name: string; inspectionType?: string; checklistItems?: any; }

// Приводим произвольную структуру checklistItems к секциям с пунктами
function normalize(items: any): Section[] {
  if (!Array.isArray(items)) return [];
  const asPoint = (p: any, si: number, pi: number): Point => {
    if (typeof p === 'string') return { key: `${si}.${pi}`, name: p };
    const name = p.name || p.title || p.label || p.text || p.description || p.code || `Пункт ${pi + 1}`;
    return { key: String(p.code ?? p.id ?? `${si}.${pi}`), code: p.code ?? p.id, name, required: p.required ?? p.isRequired };
  };
  const looksLikeSection = (el: any) =>
    el && typeof el === 'object' && (Array.isArray(el.items) || Array.isArray(el.points) || Array.isArray(el.children));
  if (items.some(looksLikeSection)) {
    return items.map((sec: any, si: number) => {
      const pts = sec.items || sec.points || sec.children || [];
      return { title: sec.title || sec.name || `Раздел ${si + 1}`, points: pts.map((p: any, pi: number) => asPoint(p, si, pi)) };
    });
  }
  return [{ title: 'Пункты контроля', points: items.map((p: any, pi: number) => asPoint(p, 0, pi)) }];
}

export default function ConductInspectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);

  const [insp, setInsp] = useState<Inspection | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [resMap, setResMap] = useState<Record<string, ResultEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: i }, { data: tplResp }] = await Promise.all([
        api.get<Inspection>(`/inspections/${id}`),
        api.get('/inspection-templates', { params: { limit: 200 } }),
      ]);
      setInsp(i);
      const tpls: Template[] = tplResp?.data || tplResp?.items || (Array.isArray(tplResp) ? tplResp : []);
      setTemplates(tpls);

      // Восстанавливаем ранее сохранённые результаты
      const saved = i.checklistResults?.[0];
      const initMap: Record<string, ResultEntry> = {};
      for (const r of saved?.results ?? []) initMap[r.key] = r;
      setResMap(initMap);

      // Выбор шаблона: ранее сохранённый → по типу инспекции → первый
      const chosen =
        tpls.find((x) => x.id === saved?.checklistTemplateId) ||
        tpls.find((x) => x.inspectionType && x.inspectionType === i.inspectionType) ||
        tpls[0];
      if (chosen) {
        setTemplateId(chosen.id);
        setSections(normalize(chosen.checklistItems));
      }
    } catch {
      setInsp(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onTemplateChange = (tid: number) => {
    setTemplateId(tid);
    const tpl = templates.find((x) => x.id === tid);
    setSections(normalize(tpl?.checklistItems));
  };

  const setStatus = (p: Point, status: CheckStatus) => {
    setResMap((m) => ({ ...m, [p.key]: { ...m[p.key], key: p.key, code: p.code, name: p.name, status } }));
  };
  const setComment = (p: Point, comment: string) => {
    setResMap((m) => ({ ...m, [p.key]: { key: p.key, code: p.code, name: p.name, status: m[p.key]?.status ?? 'none', comment } }));
  };

  const allPoints = useMemo(() => sections.flatMap((s) => s.points), [sections]);
  const counts = useMemo(() => {
    const c = { pass: 0, remark: 0, fail: 0, none: 0 } as Record<CheckStatus, number>;
    for (const p of allPoints) c[(resMap[p.key]?.status ?? 'none') as CheckStatus]++;
    return c;
  }, [allPoints, resMap]);
  const checked = counts.pass + counts.remark + counts.fail;

  const buildResults = (): ResultEntry[] =>
    allPoints.map((p) => resMap[p.key] ?? { key: p.key, code: p.code, name: p.name, status: 'none' });

  const save = async (silent = false) => {
    if (!insp) return false;
    setSaving(true);
    try {
      await api.put(`/inspections/${insp.id}/checklist`, {
        checklistTemplateId: templateId ?? undefined,
        results: buildResults(),
      });
      if (!silent) addToast('success', 'Чек-лист сохранён');
      return true;
    } catch {
      addToast('error', 'Не удалось сохранить чек-лист');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const complete = async () => {
    const ok = await save(true);
    if (!ok || !insp) return;
    setSaving(true);
    try {
      await api.put(`/inspections/${insp.id}`, { status: 2, actualDate: new Date().toISOString().slice(0, 10) });
      addToast('success', 'Инспекция завершена');
      router.push(`/dashboard/technadzor/inspections/${insp.id}`);
    } catch {
      addToast('error', 'Не удалось завершить инспекцию');
    } finally {
      setSaving(false);
    }
  };

  const createDefect = async (p: Point) => {
    if (!insp) return;
    setSaving(true);
    try {
      const { data: d } = await api.post('/defects', {
        title: p.name,
        description: resMap[p.key]?.comment || undefined,
        inspectionId: insp.id,
        projectId: insp.projectId,
        defectType: 'quality',
        severity: 2,
        status: 0,
        reportedDate: new Date().toISOString().slice(0, 10),
      });
      setStatus(p, 'fail');
      addToast('success', `Дефект создан${d?.defectNumber ? `: ${d.defectNumber}` : ''}`);
    } catch {
      addToast('error', 'Не удалось создать дефект');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        <div className="animate-pulse h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="animate-pulse h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      </div>
    );
  }
  if (!insp) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        <p className="text-gray-500 dark:text-gray-400">{t('Инспекция не найдена')}</p>
      </div>
    );
  }

  const STATUS_BTNS: Array<{ k: CheckStatus; cls: string }> = [
    { k: 'pass', cls: 'border-green-300 text-green-700 dark:text-green-300 data-[on=true]:bg-green-500 data-[on=true]:text-white' },
    { k: 'remark', cls: 'border-yellow-300 text-yellow-700 dark:text-yellow-300 data-[on=true]:bg-yellow-500 data-[on=true]:text-white' },
    { k: 'fail', cls: 'border-red-300 text-red-700 dark:text-red-300 data-[on=true]:bg-red-500 data-[on=true]:text-white' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
        <Link href="/dashboard/technadzor" className="text-violet-500 hover:text-violet-600">{t('Технадзор')}</Link>
        <span>›</span>
        <Link href="/dashboard/technadzor/inspections" className="text-violet-500 hover:text-violet-600">{t('Мои инспекции')}</Link>
        <span>›</span>
        <Link href={`/dashboard/technadzor/inspections/${insp.id}`} className="text-violet-500 hover:text-violet-600">{insp.inspectionNumber || `#${insp.id}`}</Link>
        <span>›</span>
        <span className="text-gray-700 dark:text-gray-200">{t('Проведение')}</span>
      </nav>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{t('Проведение инспекции')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{insp.inspectionNumber || `INSP-${insp.id}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => save()} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50">{t('Сохранить')}</button>
          <button onClick={complete} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50">{t('Завершить инспекцию')}</button>
        </div>
      </div>

      {/* Прогресс + выбор шаблона */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('Шаблон чек-листа')}:</span>
            <select
              value={templateId ?? ''}
              onChange={(e) => onTemplateChange(Number(e.target.value))}
              className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-gray-800 dark:text-gray-100"
            >
              {templates.length === 0 && <option value="">{t('Нет шаблонов')}</option>}
              {templates.map((tpl) => <option key={tpl.id} value={tpl.id}>{tpl.name}</option>)}
            </select>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{checked} / {allPoints.length}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden mb-3">
          <div className="h-full bg-violet-500" style={{ width: allPoints.length ? `${(checked / allPoints.length) * 100}%` : '0%' }} />
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          {(['pass', 'remark', 'fail', 'none'] as const).map((k) => (
            <div key={k} className="rounded-xl bg-gray-50 dark:bg-gray-900/40 py-2">
              <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{counts[k]}</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">{t(CHECK_STATUS[k].label)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Чек-лист */}
      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-sm text-gray-400">
          {t('В выбранном шаблоне нет пунктов контроля')}
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((sec, si) => (
            <div key={si} className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 font-semibold text-gray-800 dark:text-gray-100">
                {si + 1}. {sec.title}
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {sec.points.filter((p) => (resMap[p.key]?.status ?? 'none') !== 'none').length}/{sec.points.length}
                </span>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {sec.points.map((p) => {
                  const cur = resMap[p.key]?.status ?? 'none';
                  return (
                    <li key={p.key} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-gray-800 dark:text-gray-100">
                            {p.code && <span className="text-gray-400 mr-1">{p.code}</span>}{p.name}
                            {p.required && <span className="ml-1 text-red-400">*</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {STATUS_BTNS.map(({ k, cls }) => (
                            <button
                              key={k}
                              data-on={cur === k}
                              onClick={() => setStatus(p, cur === k ? 'none' : k)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border bg-white dark:bg-gray-700/40 ${cls}`}
                            >
                              {t(CHECK_STATUS[k].label)}
                            </button>
                          ))}
                          <button
                            onClick={() => createDefect(p)}
                            disabled={saving}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium border border-violet-300 text-violet-600 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 disabled:opacity-50"
                          >
                            + {t('Дефект')}
                          </button>
                        </div>
                      </div>
                      {(cur === 'remark' || cur === 'fail' || resMap[p.key]?.comment) && (
                        <input
                          value={resMap[p.key]?.comment ?? ''}
                          onChange={(e) => setComment(p, e.target.value)}
                          placeholder={t('Комментарий…')}
                          className="mt-2 w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-gray-800 dark:text-gray-100"
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
