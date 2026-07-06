'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';
import Badge, { CHECK_STATUS } from '@/components/technadzor/Badge';
import { toLocalYmd } from '@/lib/utils';

type CheckStatus = 'pass' | 'remark' | 'fail' | 'none';

interface Point { key: string; code?: string; name: string; required?: boolean; controlPointId?: number; }
interface TypicalDefect { name: string; code?: string; category?: string; criticality?: number; description?: string; recommendation?: string; }
interface Section { title: string; points: Point[]; }
interface ResultEntry { key: string; code?: string; name?: string; status: CheckStatus; comment?: string; photos?: string[]; }

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
    return { key: String(p.code ?? p.id ?? `${si}.${pi}`), code: p.code ?? p.id, name, required: p.required ?? p.isRequired, controlPointId: p.controlPointId };
  };
  const looksLikeSection = (el: any) =>
    el && typeof el === 'object' && (Array.isArray(el.items) || Array.isArray(el.points) || Array.isArray(el.children));
  const hasContent = (p: any) => typeof p === 'string' ? p.trim() : !!(p.name || p.title || p.label || p.text || p.description || p.code || p.controlPointId != null || p.id != null);
  if (items.some(looksLikeSection)) {
    return items.map((sec: any, si: number) => {
      const pts = (sec.items || sec.points || sec.children || []).filter(hasContent);
      return { title: sec.title || sec.name || `Раздел ${si + 1}`, points: pts.map((p: any, pi: number) => asPoint(p, si, pi)) };
    }).filter((s) => s.points.length > 0);
  }
  return [{ title: 'Пункты контроля', points: items.filter(hasContent).map((p: any, pi: number) => asPoint(p, 0, pi)) }];
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
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Выбор типового дефекта из привязанного контрольного пункта
  const [defectPicker, setDefectPicker] = useState<{ point: Point; defects: TypicalDefect[] } | null>(null);

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
    setResMap((m) => ({ ...m, [p.key]: { ...m[p.key], key: p.key, code: p.code, name: p.name, status: m[p.key]?.status ?? 'none', comment } }));
  };

  const uploadPhotos = async (p: Point, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    setSaving(true);
    try {
      const { data } = await api.post('/inspections/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const urls: string[] = (Array.isArray(data) ? data : []).map((x: any) => x.fileUrl).filter(Boolean);
      setResMap((m) => {
        const prev = m[p.key];
        return { ...m, [p.key]: { ...prev, key: p.key, code: p.code, name: p.name, status: prev?.status ?? 'none', photos: [...(prev?.photos ?? []), ...urls] } };
      });
    } catch {
      addToast('error', 'Не удалось загрузить фото');
    } finally {
      setSaving(false);
    }
  };

  const removePhoto = (p: Point, url: string) => {
    setResMap((m) => {
      const prev = m[p.key];
      if (!prev) return m;
      return { ...m, [p.key]: { ...prev, photos: (prev.photos ?? []).filter((u) => u !== url) } };
    });
  };

  const allPoints = useMemo(() => sections.flatMap((s) => s.points), [sections]);
  const counts = useMemo(() => {
    const c = { pass: 0, remark: 0, fail: 0, none: 0 } as Record<CheckStatus, number>;
    for (const p of allPoints) c[(resMap[p.key]?.status ?? 'none') as CheckStatus]++;
    return c;
  }, [allPoints, resMap]);
  const checked = counts.pass + counts.remark + counts.fail;

  // Текущий пункт для пошагового мастера
  useEffect(() => {
    if (allPoints.length && (!currentKey || !allPoints.some((p) => p.key === currentKey))) {
      setCurrentKey(allPoints[0].key);
    }
  }, [allPoints, currentKey]);
  const currentIndex = allPoints.findIndex((p) => p.key === currentKey);
  const currentPoint = currentIndex >= 0 ? allPoints[currentIndex] : null;
  const goPrev = () => { if (currentIndex > 0) setCurrentKey(allPoints[currentIndex - 1].key); };
  const goNext = () => { if (currentIndex < allPoints.length - 1) setCurrentKey(allPoints[currentIndex + 1].key); };

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
      await api.put(`/inspections/${insp.id}`, { status: 2, actualDate: toLocalYmd() });
      addToast('success', 'Инспекция завершена');
      router.push(`/dashboard/technadzor/inspections/${insp.id}`);
    } catch {
      addToast('error', 'Не удалось завершить инспекцию');
    } finally {
      setSaving(false);
    }
  };

  // Создание дефекта; defTpl — выбранный типовой дефект (если есть)
  const createDefect = async (p: Point, defTpl?: TypicalDefect) => {
    if (!insp) return;
    setSaving(true);
    try {
      const photos = resMap[p.key]?.photos ?? [];
      const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
      const { data: d } = await api.post('/defects', {
        defectNumber: `DEF-${Date.now()}-${rand}`,
        title: defTpl?.name || p.name,
        description: defTpl?.description || resMap[p.key]?.comment || undefined,
        category: defTpl?.category || undefined,
        inspectionId: insp.id,
        projectId: insp.projectId,
        defectType: 'quality',
        severity: defTpl?.criticality ?? 2,
        status: 0,
        reportedDate: toLocalYmd(),
        ...(photos.length ? { photos } : {}),
      });
      setStatus(p, 'fail');
      setDefectPicker(null);
      addToast('success', `Дефект создан${d?.defectNumber ? `: ${d.defectNumber}` : ''}`);
    } catch {
      addToast('error', 'Не удалось создать дефект');
    } finally {
      setSaving(false);
    }
  };

  // Старт создания: если у пункта есть привязанный контрольный пункт с типовыми
  // дефектами — предложить выбрать из них; иначе создать сразу.
  const startCreateDefect = async (p: Point) => {
    if (!p.controlPointId) { createDefect(p); return; }
    setSaving(true);
    try {
      const { data } = await api.get(`/control-points/${p.controlPointId}`);
      const list: TypicalDefect[] = Array.isArray(data?.typicalDefects) ? data.typicalDefects : [];
      if (list.length > 0) setDefectPicker({ point: p, defects: list });
      else createDefect(p);
    } catch {
      createDefect(p);
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

      {/* Чек-лист: слева структура, справа панель текущего пункта */}
      {sections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center text-sm text-gray-400">
          {t('В выбранном шаблоне нет пунктов контроля')}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Структура */}
          <div className="lg:col-span-3 space-y-4">
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
                    const meta = CHECK_STATUS[cur];
                    const nPhotos = resMap[p.key]?.photos?.length ?? 0;
                    return (
                      <li key={p.key}>
                        <button
                          onClick={() => setCurrentKey(p.key)}
                          className={`w-full text-left px-5 py-3 flex items-center justify-between gap-3 transition ${p.key === currentKey ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                        >
                          <span className="min-w-0 text-sm text-gray-800 dark:text-gray-100 truncate">
                            {p.code && <span className="text-gray-400 mr-1">{p.code}</span>}{p.name}
                            {p.required && <span className="ml-1 text-red-400">*</span>}
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            {nPhotos > 0 && <span className="text-[11px] text-gray-400">📷 {nPhotos}</span>}
                            <Badge label={t(meta.label)} color={meta.color} />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Панель текущего пункта */}
          <div className="lg:col-span-2">
            {currentPoint && (() => {
              const p = currentPoint;
              const cur = resMap[p.key]?.status ?? 'none';
              return (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-xs p-5 lg:sticky lg:top-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500">{t('Текущий пункт контроля')}</span>
                    <span className="text-xs text-gray-400">{currentIndex + 1} {t('из')} {allPoints.length}</span>
                  </div>
                  {p.code && <div className="text-xs text-gray-400 mb-1">{p.code}</div>}
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{p.name}{p.required && <span className="ml-1 text-red-400">*</span>}</h3>

                  <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{t('Статус проверки')}</div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {STATUS_BTNS.map(({ k, cls }) => (
                      <button
                        key={k}
                        data-on={cur === k}
                        onClick={() => setStatus(p, cur === k ? 'none' : k)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium border bg-white dark:bg-gray-700/40 ${cls}`}
                      >
                        {t(CHECK_STATUS[k].label)}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{t('Фотофиксация')}</div>
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    {(resMap[p.key]?.photos ?? []).map((url) => (
                      <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => removePhoto(p, url)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100">×</button>
                      </div>
                    ))}
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer text-gray-400 hover:border-violet-400 hover:text-violet-400">
                      <input type="file" accept="image/*" multiple capture="environment" className="hidden" disabled={saving} onChange={(e) => { uploadPhotos(p, e.target.files); e.currentTarget.value = ''; }} />
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" /></svg>
                    </label>
                  </div>

                  <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{t('Комментарий')}</div>
                  <textarea
                    value={resMap[p.key]?.comment ?? ''}
                    onChange={(e) => setComment(p, e.target.value)}
                    rows={2}
                    placeholder={t('Комментарий…')}
                    className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100 mb-3"
                  />

                  <button onClick={() => startCreateDefect(p)} disabled={saving} className="w-full mb-4 px-3 py-2 rounded-lg text-sm font-medium border border-violet-300 text-violet-600 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 disabled:opacity-50">
                    + {t('Создать дефект по этому пункту')}
                  </button>

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={goPrev} disabled={currentIndex <= 0} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-40">← {t('Предыдущий')}</button>
                    <button onClick={goNext} disabled={currentIndex >= allPoints.length - 1} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40">{t('Следующий')} →</button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Выбор типового дефекта из контрольного пункта */}
      {defectPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDefectPicker(null)}>
          <div className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('Типовой дефект')}</h3>
              <button onClick={() => setDefectPicker(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {defectPicker.defects.map((d, i) => (
                <button key={i} onClick={() => createDefect(defectPicker.point, d)} disabled={saving} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-500/10 disabled:opacity-50">
                  <span className="flex items-center gap-2">
                    <Badge label={t((CRITICALITY_META[d.criticality ?? 2] ?? CRITICALITY_META[2]).label)} color={(CRITICALITY_META[d.criticality ?? 2] ?? CRITICALITY_META[2]).color} />
                    <span className="text-sm text-gray-800 dark:text-gray-100">{d.name}</span>
                  </span>
                  {d.description && <span className="block text-xs text-gray-400 mt-1 line-clamp-2">{d.description}</span>}
                </button>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-between">
              <button onClick={() => createDefect(defectPicker.point)} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50">{t('Свой дефект')}</button>
              <button onClick={() => setDefectPicker(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700">{t('Отмена')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CRITICALITY_META: Record<number, { label: string; color: string }> = {
  1: { label: 'Низкая', color: 'green' },
  2: { label: 'Средняя', color: 'yellow' },
  3: { label: 'Высокая', color: 'orange' },
  4: { label: 'Критическая', color: 'red' },
};
