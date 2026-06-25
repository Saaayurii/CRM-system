'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';

interface Point { code: string; name: string; required: boolean; controlPointId?: number; }
interface Section { title: string; items: Point[]; collapsed?: boolean; }
interface LibPoint { id: number; code?: string; name: string; section?: string; subsection?: string; required?: boolean; }

const emptyPoint = (): Point => ({ code: '', name: '', required: true });
const emptySection = (): Section => ({ title: '', items: [emptyPoint()] });

const ROLE_OPTIONS: Array<{ id: number; label: string }> = [
  { id: 1, label: 'Супер-админ' },
  { id: 2, label: 'Админ' },
  { id: 4, label: 'Проект-менеджер' },
  { id: 5, label: 'Прораб' },
  { id: 9, label: 'Инспектор' },
];

// Тумблер-переключатель (как на макете), вместо нативного чекбокса
function Toggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => set(!on)}
      className={`relative w-11 h-6 rounded-full transition shrink-0 ${on ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'}`}
      aria-pressed={on}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}

// Нормализуем что угодно из БД в секции (совместимо с проведением инспекции)
function fromChecklistItems(items: any): Section[] {
  if (!Array.isArray(items) || items.length === 0) return [emptySection()];
  const looksLikeSection = (el: any) => el && typeof el === 'object' && (Array.isArray(el.items) || Array.isArray(el.points));
  if (items.some(looksLikeSection)) {
    return items.map((s: any) => ({
      title: s.title || s.name || '',
      items: (s.items || s.points || []).map((p: any) =>
        typeof p === 'string'
          ? { code: '', name: p, required: true }
          : { code: String(p.code ?? p.id ?? ''), name: p.name || p.title || p.label || '', required: p.required ?? p.isRequired ?? true, controlPointId: p.controlPointId },
      ),
    }));
  }
  return [{ title: 'Пункты контроля', items: items.map((p: any) => typeof p === 'string' ? { code: '', name: p, required: true } : { code: String(p.code ?? ''), name: p.name || p.title || '', required: p.required ?? true }) }];
}

export default function TemplateConstructorPage() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');
  const addToast = useToastStore((s) => s.addToast);

  const [name, setName] = useState('');
  const [inspectionType, setInspectionType] = useState('');
  const [sections, setSections] = useState<Section[]>([emptySection()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [tab, setTab] = useState<'structure' | 'settings' | 'access'>('structure');
  // Библиотека контрольных пунктов
  const [library, setLibrary] = useState<LibPoint[]>([]);
  const [pickerFor, setPickerFor] = useState<number | null>(null); // индекс секции
  const [pickerQ, setPickerQ] = useState('');
  // Настройки инспекции
  const [objectApplication, setObjectApplication] = useState('');
  const [ratingWeight, setRatingWeight] = useState<number>(100);
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [allowSkip, setAllowSkip] = useState(false);
  const [autoCreateDefects, setAutoCreateDefects] = useState(false);
  const [allowedRoleIds, setAllowedRoleIds] = useState<number[]>([]);

  const load = useCallback(async () => {
    if (!editId) return;
    try {
      const { data } = await api.get(`/inspection-templates/${editId}`);
      setName(data.name || '');
      setInspectionType(data.inspectionType || '');
      setSections(fromChecklistItems(data.checklistItems));
      const s = data.settings || {};
      setObjectApplication(s.objectApplication || '');
      setRatingWeight(typeof s.ratingWeight === 'number' ? s.ratingWeight : 100);
      setRequirePhoto(!!s.requirePhoto);
      setAllowSkip(!!s.allowSkip);
      setAutoCreateDefects(!!s.autoCreateDefects);
      setAllowedRoleIds(Array.isArray(s.allowedRoleIds) ? s.allowedRoleIds : []);
    } catch {
      addToast('error', 'Не удалось загрузить шаблон');
    } finally {
      setLoading(false);
    }
  }, [editId, addToast]);

  useEffect(() => { load(); }, [load]);

  // Загрузка библиотеки контрольных пунктов (только опубликованные)
  useEffect(() => {
    api.get('/control-points', { params: { limit: 500, status: 'active' } })
      .then(({ data }) => setLibrary(data?.data || data?.items || (Array.isArray(data) ? data : [])))
      .catch(() => {});
  }, []);

  const addFromLibrary = (si: number, lp: LibPoint) => {
    setSections((s) => s.map((sec, i) => i !== si ? sec : {
      ...sec,
      items: [...sec.items.filter((p) => p.name.trim() || p.code.trim()), {
        code: lp.code || '', name: lp.name, required: lp.required ?? true, controlPointId: lp.id,
      }],
    }));
  };

  // ─── мутации секций ───
  const updateSection = (si: number, patch: Partial<Section>) =>
    setSections((s) => s.map((sec, i) => i === si ? { ...sec, ...patch } : sec));
  const addSection = () => setSections((s) => [...s, emptySection()]);
  const removeSection = (si: number) => setSections((s) => s.filter((_, i) => i !== si));
  const moveSection = (si: number, dir: -1 | 1) =>
    setSections((s) => {
      const j = si + dir;
      if (j < 0 || j >= s.length) return s;
      const copy = [...s];
      [copy[si], copy[j]] = [copy[j], copy[si]];
      return copy;
    });

  // ─── мутации пунктов ───
  const updatePoint = (si: number, pi: number, patch: Partial<Point>) =>
    setSections((s) => s.map((sec, i) => i !== si ? sec : { ...sec, items: sec.items.map((p, j) => j === pi ? { ...p, ...patch } : p) }));
  const addPoint = (si: number) =>
    setSections((s) => s.map((sec, i) => i !== si ? sec : { ...sec, items: [...sec.items, emptyPoint()] }));
  const removePoint = (si: number, pi: number) =>
    setSections((s) => s.map((sec, i) => i !== si ? sec : { ...sec, items: sec.items.filter((_, j) => j !== pi) }));
  const movePoint = (si: number, pi: number, dir: -1 | 1) =>
    setSections((s) => s.map((sec, i) => {
      if (i !== si) return sec;
      const j = pi + dir;
      if (j < 0 || j >= sec.items.length) return sec;
      const items = [...sec.items];
      [items[pi], items[j]] = [items[j], items[pi]];
      return { ...sec, items };
    }));

  // ─── сводка ───
  const totalPoints = sections.reduce((acc, s) => acc + s.items.length, 0);
  const requiredPoints = sections.reduce((acc, s) => acc + s.items.filter((p) => p.required).length, 0);

  const buildPayload = (isActive: boolean) => ({
    name: name.trim(),
    inspectionType: inspectionType.trim() || undefined,
    isActive,
    settings: {
      objectApplication: objectApplication.trim() || undefined,
      ratingWeight,
      requirePhoto,
      allowSkip,
      autoCreateDefects,
      allowedRoleIds,
    },
    checklistItems: sections
      .filter((s) => s.title.trim() || s.items.some((p) => p.name.trim()))
      .map((s) => ({
        title: s.title.trim() || 'Без названия',
        items: s.items
          .filter((p) => p.name.trim())
          .map((p) => ({ code: p.code.trim() || undefined, name: p.name.trim(), required: p.required, controlPointId: p.controlPointId })),
      })),
  });

  const save = async (isActive: boolean) => {
    if (!name.trim()) { addToast('error', 'Укажите название шаблона'); return; }
    setSaving(true);
    try {
      const payload = buildPayload(isActive);
      if (editId) await api.put(`/inspection-templates/${editId}`, payload);
      else await api.post('/inspection-templates', payload);
      addToast('success', isActive ? 'Шаблон опубликован' : 'Черновик сохранён');
      router.push('/dashboard/technadzor/templates');
    } catch {
      addToast('error', 'Не удалось сохранить шаблон');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto"><div className="animate-pulse h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl" /></div>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
        <Link href="/dashboard/technadzor" className="text-violet-500 hover:text-violet-600">{t('Технадзор')}</Link>
        <span>›</span>
        <Link href="/dashboard/technadzor/templates" className="text-violet-500 hover:text-violet-600">{t('Шаблоны инспекций')}</Link>
        <span>›</span>
        <span className="text-gray-700 dark:text-gray-200">{editId ? t('Редактирование') : t('Новый шаблон')}</span>
      </nav>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{editId ? t('Редактирование шаблона') : t('Новый шаблон инспекции')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('Создайте структуру инспекции: разделы и контрольные пункты')}</p>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/dashboard/technadzor/templates" className="px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/40 transition">{t('Отмена')}</Link>
          <button onClick={() => save(false)} disabled={saving} className="px-3 py-1.5 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/40 transition disabled:opacity-50">{t('Сохранить черновик')}</button>
          <button onClick={() => save(true)} disabled={saving} className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-violet-600 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition disabled:opacity-50">{t('Сохранить и опубликовать')}</button>
        </div>
      </div>

      {/* Вкладки конструктора */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {([
          { k: 'structure', label: 'Структура шаблона' },
          { k: 'settings', label: 'Настройки инспекции' },
          { k: 'access', label: 'Права доступа' },
        ] as const).map((it) => (
          <button
            key={it.k}
            onClick={() => setTab(it.k)}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${
              tab === it.k
                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t(it.label)}
          </button>
        ))}
      </div>

      {tab === 'settings' && (
        <div className="max-w-2xl rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Объект применения')}</label>
              <input value={objectApplication} onChange={(e) => setObjectApplication(e.target.value)} placeholder={t('Напр.: Квартира / Помещение')} className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Вес инспекции для рейтинга')}</label>
              <input type="number" value={ratingWeight} onChange={(e) => setRatingWeight(Number(e.target.value))} className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100" />
            </div>
          </div>
          {([
            { v: requirePhoto, set: setRequirePhoto, label: 'Требовать фото по каждому пункту', hint: 'Завершение инспекции потребует фото на каждом проверенном пункте' },
            { v: allowSkip, set: setAllowSkip, label: 'Разрешить пропуск пунктов', hint: 'Можно завершить инспекцию с непроверенными пунктами' },
            { v: autoCreateDefects, set: setAutoCreateDefects, label: 'Автоматически создавать дефекты', hint: 'При статусе «Не соответствует» дефект создаётся автоматически' },
          ] as const).map((row, i) => (
            <div key={i} className="flex items-start justify-between gap-4">
              <span>
                <span className="text-sm text-gray-800 dark:text-gray-100">{t(row.label)}</span>
                <span className="block text-xs text-gray-400">{t(row.hint)}</span>
              </span>
              <Toggle on={row.v} set={row.set} />
            </div>
          ))}
        </div>
      )}

      {tab === 'access' && (
        <div className="max-w-2xl rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{t('Кто может проводить инспекции по шаблону')}</h3>
          <p className="text-xs text-gray-400 mb-4">{t('Пусто = доступно всем ролям с доступом к технадзору')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ROLE_OPTIONS.map((r) => {
              const on = allowedRoleIds.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setAllowedRoleIds((ids) => on ? ids.filter((x) => x !== r.id) : [...ids, r.id])}
                  className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 transition ${on ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-violet-300'}`}
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${on ? 'bg-violet-600 text-white' : 'border border-gray-300 dark:border-gray-500'}`}>{on ? '✓' : ''}</span>
                  {t(r.label)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'structure' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Структура */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500">{t('Структура шаблона')}</h2>
            <button onClick={addSection} className="text-sm text-violet-600 dark:text-violet-400 hover:underline">+ {t('Добавить раздел')}</button>
          </div>

          {sections.map((sec, si) => (
            <div key={si} className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <span className="text-gray-400 font-semibold w-6">{si + 1}.</span>
                <input
                  value={sec.title}
                  onChange={(e) => updateSection(si, { title: e.target.value })}
                  placeholder={t('Название раздела')}
                  className="flex-1 text-sm font-medium rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:border-violet-400 bg-transparent px-2 py-1 text-gray-800 dark:text-gray-100"
                />
                <button onClick={() => moveSection(si, -1)} disabled={si === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title={t('Вверх')}>▲</button>
                <button onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30" title={t('Вниз')}>▼</button>
                <button onClick={() => updateSection(si, { collapsed: !sec.collapsed })} className="p-1 text-gray-400 hover:text-gray-600">{sec.collapsed ? '▸' : '▾'}</button>
                <button onClick={() => removeSection(si)} className="p-1 text-red-400 hover:text-red-600" title={t('Удалить раздел')}>✕</button>
              </div>

              {!sec.collapsed && (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {sec.items.map((p, pi) => (
                    <div key={pi} className="px-4 py-2.5 flex items-center gap-2">
                      <input
                        value={p.code}
                        onChange={(e) => updatePoint(si, pi, { code: e.target.value })}
                        placeholder={t('Код')}
                        className="w-24 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-gray-800 dark:text-gray-100"
                      />
                      <input
                        value={p.name}
                        onChange={(e) => updatePoint(si, pi, { name: e.target.value })}
                        placeholder={t('Контрольный пункт')}
                        className="flex-1 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-gray-800 dark:text-gray-100"
                      />
                      <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0 cursor-pointer select-none">
                        <input type="checkbox" checked={p.required} onChange={(e) => updatePoint(si, pi, { required: e.target.checked })} />
                        {t('Обяз.')}
                      </label>
                      <button onClick={() => movePoint(si, pi, -1)} disabled={pi === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">▲</button>
                      <button onClick={() => movePoint(si, pi, 1)} disabled={pi === sec.items.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">▼</button>
                      <button onClick={() => removePoint(si, pi)} className="p-1 text-red-400 hover:text-red-600">✕</button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={() => addPoint(si)} className="flex-1 py-2 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg">+ {t('Добавить пункт')}</button>
                    <button onClick={() => { setPickerFor(si); setPickerQ(''); }} className="flex-1 py-2 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg border border-violet-200 dark:border-violet-500/30">{t('Из библиотеки')}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Настройки + сводка + предпросмотр */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs space-y-3">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('Настройки')}</h3>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Название шаблона')} *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Тип инспекции')}</label>
              <input value={inspectionType} onChange={(e) => setInspectionType(e.target.value)} placeholder={t('Напр.: Приёмочная')} className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100" />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Сводка')}</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{sections.length}</div><div className="text-[11px] text-gray-500 dark:text-gray-400">{t('Разделов')}</div></div>
              <div><div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalPoints}</div><div className="text-[11px] text-gray-500 dark:text-gray-400">{t('Пунктов')}</div></div>
              <div><div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{requiredPoints}</div><div className="text-[11px] text-gray-500 dark:text-gray-400">{t('Обязательных')}</div></div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">{t('Предпросмотр')}</h3>
            <div className="space-y-2 text-sm max-h-80 overflow-y-auto">
              {sections.map((s, si) => (
                <div key={si}>
                  <div className="font-medium text-gray-700 dark:text-gray-200">{si + 1}. {s.title || t('Без названия')} ({s.items.filter((p) => p.name.trim()).length})</div>
                  <ul className="ml-3 mt-1 space-y-0.5">
                    {s.items.filter((p) => p.name.trim()).map((p, pi) => (
                      <li key={pi} className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${p.required ? 'bg-violet-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        {p.code && <span className="text-gray-400">{p.code}</span>} {p.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Модалка выбора пунктов из библиотеки */}
      {pickerFor !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPickerFor(null)}>
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('Пункты из библиотеки')}</h3>
              <button onClick={() => setPickerFor(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <input value={pickerQ} onChange={(e) => setPickerQ(e.target.value)} placeholder={t('Поиск по названию или коду…')} className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100" />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {library.length === 0 ? (
                <p className="text-sm text-gray-400 p-6 text-center">{t('В библиотеке нет опубликованных пунктов. Создайте их в разделе «Пункты контроля».')}</p>
              ) : (
                (() => {
                  const list = pickerQ.trim() ? library.filter((l) => `${l.code ?? ''} ${l.name}`.toLowerCase().includes(pickerQ.toLowerCase())) : library;
                  if (list.length === 0) return <p className="text-sm text-gray-400 p-6 text-center">{t('Ничего не найдено')}</p>;
                  return list.map((lp) => (
                    <button
                      key={lp.id}
                      onClick={() => { addFromLibrary(pickerFor, lp); addToast('success', 'Пункт добавлен'); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-500/10 flex items-center justify-between gap-3"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm text-gray-800 dark:text-gray-100 truncate">{lp.name}</span>
                        <span className="block text-xs text-gray-400">{[lp.code, lp.section, lp.subsection].filter(Boolean).join(' · ') || '—'}</span>
                      </span>
                      <span className="text-violet-500 shrink-0">+</span>
                    </button>
                  ));
                })()
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-right">
              <button onClick={() => setPickerFor(null)} className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white">{t('Готово')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
