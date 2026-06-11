'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import {
  CALCULATOR_META,
  type CalcResult,
  type CalculatorType,
  runCalculation,
} from './calculators/calculators';
import {
  type AnyCalcState,
  defaultStateFor,
  ElectricsForm,
  PlasterForm,
  ScreedForm,
  TileForm,
  WarmFloorForm,
} from './calculators/CalculatorForms';
import { useT } from '@/lib/i18n';

interface ProjectOption {
  id: number;
  name: string;
}

interface WikiPageMini {
  id: number;
  title: string;
  category?: string | null;
}

interface SavedCalculation {
  id: number;
  calculatorType: CalculatorType;
  title?: string | null;
  projectId?: number | null;
  inputs: Record<string, unknown>;
  results: { summary?: Array<{ label: string; value: string }> };
  warnings?: unknown[];
  taskId?: number | null;
  createdAt: string;
  createdByUserId?: number | null;
}

const TYPES: CalculatorType[] = ['screed', 'warm_floor', 'electrics', 'plaster', 'tile'];

export default function CalculatorsTab() {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [type, setType] = useState<CalculatorType>('screed');
  const [formState, setFormState] = useState<AnyCalcState>(() => defaultStateFor('screed'));
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [history, setHistory] = useState<SavedCalculation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savingId, setSavingId] = useState<'create' | number | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [showRequirements, setShowRequirements] = useState(false);
  const [wikiPages, setWikiPages] = useState<WikiPageMini[]>([]);
  const [title, setTitle] = useState('');

  // Calculation result is derived from form state
  const result: CalcResult = useMemo(() => {
    return runCalculation(formState.type, formState.state as unknown as Record<string, unknown>);
  }, [formState]);

  const hasErrors = result.warnings.some((w) => w.level === 'error');

  // Load projects + wiki once
  useEffect(() => {
    api
      .get('/projects', { params: { limit: 200 } })
      .then((r) => {
        const list = r.data?.projects || r.data?.data || (Array.isArray(r.data) ? r.data : []);
        setProjects(list.map((p: ProjectOption) => ({ id: p.id, name: p.name })));
      })
      .catch(() => setProjects([]));
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const params: Record<string, unknown> = { calculatorType: type, limit: 30 };
      if (projectId) params.projectId = projectId;
      const { data } = await api.get('/material-calculations', { params });
      const list = Array.isArray(data) ? data : data?.calculations || data?.data || [];
      setHistory(list);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [type, projectId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Load relevant wiki pages when requirements panel opened
  useEffect(() => {
    if (!showRequirements) return;
    const categoryByType: Record<CalculatorType, string> = {
      screed: 'стяжка',
      warm_floor: 'тёплый пол',
      electrics: 'электрика',
      plaster: 'штукатурка',
      tile: 'плитка',
    };
    const search = categoryByType[type];
    api
      .get('/wiki-pages', { params: { limit: 100 } })
      .then((r) => {
        const all: WikiPageMini[] = Array.isArray(r.data) ? r.data : r.data?.pages || r.data?.data || [];
        const filtered = all.filter(
          (p) =>
            (p.title || '').toLowerCase().includes(search) ||
            (p.category || '').toLowerCase().includes(search),
        );
        setWikiPages(filtered);
      })
      .catch(() => setWikiPages([]));
  }, [showRequirements, type]);

  const handleTypeChange = (next: CalculatorType) => {
    setType(next);
    setFormState(defaultStateFor(next));
    setTitle('');
  };

  const handleSave = async () => {
    if (hasErrors) {
      addToast('error', 'Исправьте ошибки в форме перед сохранением');
      return;
    }
    setSavingId('create');
    try {
      const payload = {
        calculatorType: type,
        title: title.trim() || undefined,
        projectId: projectId || undefined,
        inputs: formState.state,
        results: {
          summary: result.summary,
          materials: result.materials,
          delivery: result.delivery,
        },
        warnings: result.warnings,
      };
      await api.post('/material-calculations', payload);
      addToast('success', 'Расчёт сохранён');
      await loadHistory();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      addToast('error', msg || 'Не удалось сохранить расчёт');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteSaved = async (id: number) => {
    if (!confirm('Удалить сохранённый расчёт?')) return;
    setSavingId(id);
    try {
      await api.delete(`/material-calculations/${id}`);
      addToast('success', 'Удалено');
      await loadHistory();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      addToast('error', msg || 'Не удалось удалить');
    } finally {
      setSavingId(null);
    }
  };

  const handleCreatePurchaseTask = async () => {
    if (hasErrors) {
      addToast('error', 'Исправьте ошибки перед созданием задачи');
      return;
    }
    if (!projectId) {
      addToast('error', 'Выберите проект для задачи закупки');
      return;
    }
    setCreatingTask(true);
    try {
      const meta = CALCULATOR_META[type];
      const taskTitle = `Закупка: ${title.trim() || meta.label}`;
      const description = [
        `Расчёт калькулятора «${meta.label}»`,
        '',
        '**Сводка:**',
        ...result.summary.map((s) => `- ${s.label}: ${s.value}`),
        '',
        '**Материалы к закупке:**',
        ...result.materials.map(
          (m) => `- ${m.name} — ${m.quantity} ${m.unit}${m.note ? ` (${m.note})` : ''}`,
        ),
        '',
        `**Доставка:** ${result.delivery.recommendedTruck} (вес ~${result.delivery.totalWeightKg} кг${
          result.delivery.totalVolumeM3 ? `, объём ${result.delivery.totalVolumeM3} м³` : ''
        })`,
      ].join('\n');

      const taskRes = await api.post('/tasks', {
        projectId,
        title: taskTitle,
        description,
        status: 0,
        priority: 2,
      });
      const taskId = taskRes.data?.id;
      // Also save the calculation linked to that task
      await api.post('/material-calculations', {
        calculatorType: type,
        title: title.trim() || undefined,
        projectId,
        taskId: taskId || undefined,
        inputs: formState.state,
        results: {
          summary: result.summary,
          materials: result.materials,
          delivery: result.delivery,
        },
        warnings: result.warnings,
      });
      addToast('success', 'Задача закупки создана и расчёт сохранён');
      await loadHistory();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      addToast('error', msg || 'Не удалось создать задачу');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleLoadSaved = (h: SavedCalculation) => {
    if (h.calculatorType !== type) {
      setType(h.calculatorType);
    }
    const restored = defaultStateFor(h.calculatorType);
    setFormState({ ...restored, state: { ...(restored.state as object), ...(h.inputs as object) } } as AnyCalcState);
    setTitle(h.title || '');
    setProjectId(h.projectId ?? null);
  };

  return (
    <div className="space-y-6">
      {/* Calculator type tabs */}
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => {
          const meta = CALCULATOR_META[t];
          const active = type === t;
          return (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={`px-4 py-2 rounded-xl text-sm border transition-colors flex items-center gap-2 ${
                active
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-violet-300'
              }`}
            >
              <span className="text-lg">{meta.icon}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              {CALCULATOR_META[type].label}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {CALCULATOR_META[type].description}
            </p>
          </div>

          {formState.type === 'screed' && (
            <ScreedForm
              state={formState.state}
              onChange={(s) => setFormState({ type: 'screed', state: s })}
            />
          )}
          {formState.type === 'warm_floor' && (
            <WarmFloorForm
              state={formState.state}
              onChange={(s) => setFormState({ type: 'warm_floor', state: s })}
            />
          )}
          {formState.type === 'electrics' && (
            <ElectricsForm
              state={formState.state}
              onChange={(s) => setFormState({ type: 'electrics', state: s })}
            />
          )}
          {formState.type === 'plaster' && (
            <PlasterForm
              state={formState.state}
              onChange={(s) => setFormState({ type: 'plaster', state: s })}
            />
          )}
          {formState.type === 'tile' && (
            <TileForm
              state={formState.state}
              onChange={(s) => setFormState({ type: 'tile', state: s })}
            />
          )}

          <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
            <label className="block">
              <span className="block text-xs text-gray-500 mb-1">{t('Название расчёта (необязательно)')}</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('Например, «Спальня 18 м²»')}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-500 mb-1">{t('Проект')}</span>
              <select
                value={projectId ?? ''}
                onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
              >
                <option value="">{t('— не привязан —')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {result.warnings.length > 0 && (
            <div className="space-y-2">
              {result.warnings.map((w, i) => {
                const cls =
                  w.level === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    : w.level === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
                return (
                  <div key={i} className={`text-xs px-3 py-2 rounded-lg border ${cls}`}>
                    {w.message}
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Сводка')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {result.summary.map((s, i) => (
                <div
                  key={i}
                  className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900/30"
                >
                  <div className="text-[11px] uppercase text-gray-400">{s.label}</div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-0.5">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Материалы')}</h3>
            {result.materials.length === 0 ? (
              <div className="text-sm text-gray-500">{t('Введите параметры выше — список материалов появится автоматически.')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-gray-400">
                    <tr>
                      <th className="text-left py-2">{t('Материал')}</th>
                      <th className="text-right py-2">{t('Кол-во')}</th>
                      <th className="text-left py-2 pl-3">{t('Ед.')}</th>
                      <th className="text-left py-2 pl-3">{t('Примечание')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {result.materials.map((m, i) => (
                      <tr key={i}>
                        <td className="py-2 text-gray-800 dark:text-gray-100">{m.name}</td>
                        <td className="py-2 text-right font-medium text-gray-800 dark:text-gray-100">
                          {m.quantity}
                        </td>
                        <td className="py-2 pl-3 text-gray-500">{m.unit}</td>
                        <td className="py-2 pl-3 text-gray-500 text-xs">{m.note || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-xs">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Доставка')}</h3>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <div>
                Расчётный вес:{' '}
                <span className="font-semibold">{result.delivery.totalWeightKg} кг</span>
                {result.delivery.totalVolumeM3 != null && (
                  <>
                    , объём <span className="font-semibold">{result.delivery.totalVolumeM3} м³</span>
                  </>
                )}
              </div>
              <div className="mt-1">
                Рекомендуемый транспорт:{' '}
                <span className="font-semibold text-violet-600 dark:text-violet-400">
                  {result.delivery.recommendedTruck}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSave}
              disabled={hasErrors || savingId !== null}
              className="px-4 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg"
            >
              {savingId === 'create' ? 'Сохранение...' : 'Сохранить расчёт'}
            </button>
            <button
              onClick={handleCreatePurchaseTask}
              disabled={hasErrors || creatingTask || !projectId}
              className="px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg"
              title={!projectId ? 'Выберите проект' : ''}
            >
              {creatingTask ? 'Создание задачи...' : 'Создать задачу закупки'}
            </button>
            <button
              onClick={() => setShowRequirements((v) => !v)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-violet-400"
            >
              {showRequirements ? 'Скрыть требования' : 'Требования из ВИКИ'}
            </button>
          </div>

          {showRequirements && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-xs">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">
                Нормативы и инструкции
              </h3>
              {wikiPages.length === 0 ? (
                <div className="text-sm text-gray-500">
                  В Базе знаний нет страниц по теме «{CALCULATOR_META[type].label}». Добавьте их в разделе ВИКИ.
                </div>
              ) : (
                <ul className="space-y-1 text-sm">
                  {wikiPages.map((p) => (
                    <li key={p.id}>
                      <a
                        href={`/dashboard/wiki/${p.id}`}
                        className="text-violet-600 hover:underline"
                      >
                        {p.title}
                      </a>
                      {p.category && (
                        <span className="ml-2 text-xs text-gray-400">— {p.category}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs">
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex justify-between items-center px-5 py-3 border-b border-gray-100 dark:border-gray-700"
        >
          <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
            История расчётов{' '}
            <span className="text-xs font-normal text-gray-400">
              ({history.length}
              {projectId ? `, проект ${projects.find((p) => p.id === projectId)?.name ?? ''}` : ''})
            </span>
          </span>
          <span className="text-xs text-gray-500">{showHistory ? '▲' : '▼'}</span>
        </button>
        {showHistory && (
          <div className="p-5">
            {loadingHistory ? (
              <div className="text-sm text-gray-500 text-center py-2">{t('Загрузка...')}</div>
            ) : history.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-2">
                Сохранённых расчётов пока нет.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-gray-400">
                  <tr>
                    <th className="text-left py-2">{t('Название')}</th>
                    <th className="text-left py-2">{t('Проект')}</th>
                    <th className="text-left py-2">{t('Сводка')}</th>
                    <th className="text-left py-2">{t('Дата')}</th>
                    <th className="text-right py-2 w-32">{t('Действия')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {history.map((h) => {
                    const proj = projects.find((p) => p.id === h.projectId);
                    const summaryStr = h.results?.summary
                      ? h.results.summary
                          .slice(0, 2)
                          .map((s) => `${s.label}: ${s.value}`)
                          .join(' • ')
                      : '—';
                    return (
                      <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20">
                        <td className="py-2 text-gray-800 dark:text-gray-100">
                          {h.title || `Расчёт #${h.id}`}
                        </td>
                        <td className="py-2 text-gray-500">{proj?.name || '—'}</td>
                        <td className="py-2 text-gray-500 text-xs">{summaryStr}</td>
                        <td className="py-2 text-gray-500 text-xs">
                          {new Date(h.createdAt).toLocaleString('ru-RU')}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleLoadSaved(h)}
                            className="text-xs text-violet-600 hover:underline mr-3"
                          >
                            Загрузить
                          </button>
                          <button
                            onClick={() => handleDeleteSaved(h.id)}
                            disabled={savingId === h.id}
                            className="text-xs text-red-500 hover:underline disabled:opacity-50"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
