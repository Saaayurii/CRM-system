'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';

interface Pin { n: number; x: number; y: number; label?: string; color?: string }

const CHECK_TYPES = [
  { v: 'visual', label: 'Визуальный' },
  { v: 'measuring', label: 'Измерительный' },
  { v: 'functional', label: 'Функциональный' },
  { v: 'documentary', label: 'Документальный' },
  { v: 'complex', label: 'Комплексный' },
];
const CRITICALITY = [
  { v: 1, label: 'Низкая' },
  { v: 2, label: 'Средняя' },
  { v: 3, label: 'Высокая' },
  { v: 4, label: 'Критическая' },
];
const PIN_COLORS = ['#ef4444', '#f97316', '#22c55e', '#3b82f6', '#a855f7'];

const STEPS = [
  { n: 1, label: 'Создание пункта' },
  { n: 2, label: 'Типовые дефекты' },
  { n: 3, label: 'Шаблоны текстов' },
  { n: 4, label: 'Настройки отчёта' },
  { n: 5, label: 'Публикация' },
];

export default function ControlPointBuilderPage() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');
  const addToast = useToastStore((s) => s.addToast);

  // Шаг 1 — основные поля
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [version, setVersion] = useState('1.0');
  const [status, setStatus] = useState('draft');
  const [description, setDescription] = useState('');
  const [section, setSection] = useState('');
  const [subsection, setSubsection] = useState('');
  const [checkType, setCheckType] = useState('visual');
  const [criticality, setCriticality] = useState(2);
  const [weight, setWeight] = useState(100);
  const [required, setRequired] = useState(true);
  const [normativeDoc, setNormativeDoc] = useState('');
  const [normativeSection, setNormativeSection] = useState('');
  const [instruction, setInstruction] = useState('');
  // settings
  const [objectType, setObjectType] = useState('');
  const [multipleObject, setMultipleObject] = useState(false);
  const [requirement, setRequirement] = useState('');
  const [photoRequired, setPhotoRequired] = useState(true);
  const [photoMin, setPhotoMin] = useState(2);
  const [photoMax, setPhotoMax] = useState(10);
  const [photoBeforeAfter, setPhotoBeforeAfter] = useState(false);
  const [videoRequired, setVideoRequired] = useState(false);
  const [autoCreateDefect, setAutoCreateDefect] = useState(true);
  const [defaultFixDays, setDefaultFixDays] = useState<number | ''>('');
  const [tags, setTags] = useState('');
  const [sortOrder, setSortOrder] = useState(10);
  // схема
  const [schemeImageUrl, setSchemeImageUrl] = useState('');
  const [pins, setPins] = useState<Pin[]>([]);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const imgRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!editId) return;
    try {
      const { data } = await api.get(`/control-points/${editId}`);
      setName(data.name || ''); setCode(data.code || ''); setVersion(data.version || '1.0');
      setStatus(data.status || 'draft'); setDescription(data.description || '');
      setSection(data.section || ''); setSubsection(data.subsection || '');
      setCheckType(data.checkType || 'visual'); setCriticality(data.criticality ?? 2);
      setWeight(data.weight ?? 100); setRequired(data.required ?? true);
      setNormativeDoc(data.normativeDoc || ''); setNormativeSection(data.normativeSection || '');
      setInstruction(data.instruction || '');
      const s = data.settings || {};
      setObjectType(s.objectType || ''); setMultipleObject(!!s.multipleObject);
      setRequirement(s.requirement || '');
      setPhotoRequired(s.photoRequired ?? true); setPhotoMin(s.photoMin ?? 2); setPhotoMax(s.photoMax ?? 10);
      setPhotoBeforeAfter(!!s.photoBeforeAfter); setVideoRequired(!!s.videoRequired);
      setAutoCreateDefect(s.autoCreateDefect ?? true); setDefaultFixDays(s.defaultFixDays ?? '');
      setTags(Array.isArray(s.tags) ? s.tags.join(', ') : (s.tags || '')); setSortOrder(s.sortOrder ?? 10);
      const sc = data.scheme || {};
      setSchemeImageUrl(sc.imageUrl || ''); setPins(Array.isArray(sc.pins) ? sc.pins : []);
    } catch {
      addToast('error', 'Не удалось загрузить пункт');
    } finally {
      setLoading(false);
    }
  }, [editId, addToast]);

  useEffect(() => { load(); }, [load]);

  const uploadScheme = async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('files', file);
    setSaving(true);
    try {
      const { data } = await api.post('/inspections/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = (Array.isArray(data) ? data[0]?.fileUrl : null) || '';
      if (url) { setSchemeImageUrl(url); setPins([]); }
    } catch { addToast('error', 'Не удалось загрузить схему'); }
    finally { setSaving(false); }
  };

  const addPin = (e: React.MouseEvent) => {
    if (!schemeImageUrl || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    setPins((ps) => [...ps, { n: ps.length + 1, x, y, color: PIN_COLORS[ps.length % PIN_COLORS.length] }]);
  };
  const removePin = (n: number) => setPins((ps) => ps.filter((p) => p.n !== n).map((p, i) => ({ ...p, n: i + 1 })));

  const buildPayload = (st: string) => ({
    name: name.trim(), code: code.trim() || undefined, version, status: st,
    description: description.trim() || undefined,
    section: section.trim() || undefined, subsection: subsection.trim() || undefined,
    checkType, criticality, weight, required,
    normativeDoc: normativeDoc.trim() || undefined, normativeSection: normativeSection.trim() || undefined,
    instruction: instruction.trim() || undefined,
    scheme: { imageUrl: schemeImageUrl || undefined, pins },
    settings: {
      objectType: objectType.trim() || undefined, multipleObject, requirement: requirement.trim() || undefined,
      photoRequired, photoMin, photoMax, photoBeforeAfter, videoRequired,
      autoCreateDefect, defaultFixDays: defaultFixDays === '' ? undefined : defaultFixDays,
      tags: tags.split(',').map((s) => s.trim()).filter(Boolean), sortOrder,
    },
  });

  const save = async (st: string, goNext = false) => {
    if (!name.trim()) { addToast('error', 'Укажите наименование пункта'); return; }
    setSaving(true);
    try {
      const payload = buildPayload(st);
      let id = editId;
      if (editId) await api.put(`/control-points/${editId}`, payload);
      else { const { data } = await api.post('/control-points', payload); id = String(data.id); }
      addToast('success', st === 'active' ? 'Пункт опубликован' : 'Сохранено');
      if (goNext && id) router.replace(`/dashboard/technadzor/control-points/new?id=${id}`);
      else if (!goNext) router.push('/dashboard/technadzor/control-points');
    } catch { addToast('error', 'Не удалось сохранить пункт'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto"><div className="animate-pulse h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl" /></div>;
  }

  const Toggle = ({ on, set }: { on: boolean; set: (v: boolean) => void }) => (
    <button onClick={() => set(!on)} className={`relative w-10 h-6 rounded-full transition ${on ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`} />
    </button>
  );
  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
      <h3 className="text-xs uppercase tracking-wide font-semibold text-violet-500 mb-4">{t(title)}</h3>
      {children}
    </div>
  );
  const inputCls = 'w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100';
  const lbl = 'block text-xs text-gray-500 dark:text-gray-400 mb-1';

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 w-full max-w-9xl mx-auto">
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
        <Link href="/dashboard/technadzor" className="text-violet-500 hover:text-violet-600">{t('Технадзор')}</Link>
        <span>›</span>
        <Link href="/dashboard/technadzor/control-points" className="text-violet-500 hover:text-violet-600">{t('Пункты контроля')}</Link>
        <span>›</span>
        <span className="text-gray-700 dark:text-gray-200">{editId ? t('Редактирование пункта') : t('Создание пункта')}</span>
      </nav>

      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold">1</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('Создание контрольного пункта')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('Создайте новый пункт проверки и задайте его основные параметры')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/technadzor/control-points" className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">{t('Отмена')}</Link>
          <button onClick={() => save('draft')} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50">{t('Сохранить черновик')}</button>
          <button onClick={() => save('draft', true)} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50">{t('Сохранить и далее')} →</button>
        </div>
      </div>

      {/* Степпер */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
        {STEPS.map((s) => (
          <div key={s.n} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm shrink-0 ${s.n === 1 ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium' : 'text-gray-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${s.n === 1 ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{s.n}</span>
            {t(s.label)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-5">
        <Card title="Основная информация">
          <div className="space-y-3">
            <div>
              <label className={lbl}>{t('Наименование пункта')} *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder={t('Напр.: Отсутствие царапин на стеклопакете')} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className={lbl}>{t('Код пункта')}</label><input value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} placeholder="WIN-001" /></div>
              <div><label className={lbl}>{t('Версия')}</label><input value={version} onChange={(e) => setVersion(e.target.value)} className={inputCls} /></div>
              <div>
                <label className={lbl}>{t('Статус')}</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                  <option value="draft">{t('Черновик')}</option>
                  <option value="active">{t('Активен')}</option>
                  <option value="archived">{t('Архив')}</option>
                </select>
              </div>
            </div>
            <div><label className={lbl}>{t('Описание')}</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} /></div>
          </div>
        </Card>

        <Card title="Категоризация">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><label className={lbl}>{t('Раздел')}</label><input value={section} onChange={(e) => setSection(e.target.value)} className={inputCls} placeholder={t('Окна')} /></div>
              <div><label className={lbl}>{t('Подраздел')}</label><input value={subsection} onChange={(e) => setSubsection(e.target.value)} className={inputCls} placeholder={t('Стеклопакеты')} /></div>
            </div>
            <div>
              <label className={lbl}>{t('Тип проверки')}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {CHECK_TYPES.map((c) => (
                  <button key={c.v} onClick={() => setCheckType(c.v)} className={`px-2 py-1.5 rounded-lg text-xs border ${checkType === c.v ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>{t(c.label)}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>{t('Критичность')}</label>
                <select value={criticality} onChange={(e) => setCriticality(Number(e.target.value))} className={inputCls}>
                  {CRITICALITY.map((c) => <option key={c.v} value={c.v}>{t(c.label)}</option>)}
                </select>
              </div>
              <div><label className={lbl}>{t('Вес (для рейтинга)')}</label><input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className={inputCls} /></div>
            </div>
            <div><label className={lbl}>{t('Объект проверки')}</label><input value={objectType} onChange={(e) => setObjectType(e.target.value)} className={inputCls} placeholder={t('Окно')} /></div>
            <label className="flex items-center justify-between"><span className="text-sm text-gray-700 dark:text-gray-200">{t('Обязательный пункт')}</span><Toggle on={required} set={setRequired} /></label>
            <label className="flex items-center justify-between"><span className="text-sm text-gray-700 dark:text-gray-200">{t('Множественный объект')}</span><Toggle on={multipleObject} set={setMultipleObject} /></label>
          </div>
        </Card>

        <Card title="Инструкция и нормативы">
          <div className="space-y-3">
            <div><label className={lbl}>{t('Инструкция для инспектора')}</label><textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={4} className={inputCls} /></div>
            <div><label className={lbl}>{t('Нормативный документ')}</label><input value={normativeDoc} onChange={(e) => setNormativeDoc(e.target.value)} className={inputCls} placeholder="ГОСТ 30674-2013" /></div>
            <div><label className={lbl}>{t('Раздел / пункт норматива')}</label><input value={normativeSection} onChange={(e) => setNormativeSection(e.target.value)} className={inputCls} placeholder="5.2.4" /></div>
            <div><label className={lbl}>{t('Требование из норматива')}</label><textarea value={requirement} onChange={(e) => setRequirement(e.target.value)} rows={3} className={inputCls} /></div>
          </div>
        </Card>

        <Card title="Схема для отметки дефектов">
          <div className="space-y-3">
            {schemeImageUrl ? (
              <div>
                <div ref={imgRef} onClick={addPin} className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 cursor-crosshair">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={schemeImageUrl} alt="" className="w-full block select-none" />
                  {pins.map((p) => (
                    <span key={p.n} style={{ left: `${p.x}%`, top: `${p.y}%`, background: p.color }} className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold shadow">{p.n}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">{t('Клик по схеме — добавить точку')}</p>
                {pins.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {pins.map((p) => (
                      <li key={p.n} className="flex items-center gap-2 text-sm">
                        <span style={{ background: p.color }} className="w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-bold">{p.n}</span>
                        <input value={p.label ?? ''} onChange={(e) => setPins((ps) => ps.map((x) => x.n === p.n ? { ...x, label: e.target.value } : x))} placeholder={t('Подпись точки')} className="flex-1 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-gray-800 dark:text-gray-100" />
                        <button onClick={() => removePin(p.n)} className="text-red-400 hover:text-red-600">✕</button>
                      </li>
                    ))}
                  </ul>
                )}
                <button onClick={() => { setSchemeImageUrl(''); setPins([]); }} className="mt-2 text-xs text-gray-400 hover:text-gray-600">{t('Удалить схему')}</button>
              </div>
            ) : (
              <label className="block rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center cursor-pointer text-gray-400 hover:border-violet-400 hover:text-violet-400">
                <input type="file" accept="image/*" className="hidden" disabled={saving} onChange={(e) => { uploadScheme(e.target.files?.[0] ?? null); e.currentTarget.value = ''; }} />
                {t('Загрузить схему объекта')}
              </label>
            )}
          </div>
        </Card>

        <Card title="Фото и видео">
          <div className="space-y-3">
            <label className="flex items-center justify-between"><span className="text-sm text-gray-700 dark:text-gray-200">{t('Фото обязательно')}</span><Toggle on={photoRequired} set={setPhotoRequired} /></label>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={lbl}>{t('Минимум фото')}</label><input type="number" value={photoMin} onChange={(e) => setPhotoMin(Number(e.target.value))} className={inputCls} /></div>
              <div><label className={lbl}>{t('Максимум фото')}</label><input type="number" value={photoMax} onChange={(e) => setPhotoMax(Number(e.target.value))} className={inputCls} /></div>
            </div>
            <label className="flex items-center justify-between"><span className="text-sm text-gray-700 dark:text-gray-200">{t('Фото ДО/ПОСЛЕ')}</span><Toggle on={photoBeforeAfter} set={setPhotoBeforeAfter} /></label>
            <label className="flex items-center justify-between"><span className="text-sm text-gray-700 dark:text-gray-200">{t('Видео обязательно')}</span><Toggle on={videoRequired} set={setVideoRequired} /></label>
          </div>
        </Card>

        <Card title="Дополнительные настройки">
          <div className="space-y-3">
            <label className="flex items-start justify-between gap-3">
              <span><span className="text-sm text-gray-700 dark:text-gray-200">{t('Авто-создание дефекта при «Не соответствует»')}</span></span>
              <Toggle on={autoCreateDefect} set={setAutoCreateDefect} />
            </label>
            <div><label className={lbl}>{t('Срок устранения по умолчанию (дней)')}</label><input type="number" value={defaultFixDays} onChange={(e) => setDefaultFixDays(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} /></div>
            <div><label className={lbl}>{t('Теги (через запятую)')}</label><input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="окна, стеклопакеты" /></div>
            <div><label className={lbl}>{t('Порядок сортировки')}</label><input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className={inputCls} /></div>
          </div>
        </Card>

        <Card title="Предпросмотр пункта">
          <div className="text-sm space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-gray-400">{code || 'WIN-000'}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${criticality >= 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'}`}>{t(CRITICALITY.find((c) => c.v === criticality)?.label || '')}</span>
            </div>
            <div className="font-medium text-gray-800 dark:text-gray-100">{name || t('Без названия')}</div>
            <div className="text-gray-500 dark:text-gray-400">{[section, subsection, objectType].filter(Boolean).join(' › ') || '—'}</div>
            <div className="text-gray-500 dark:text-gray-400">{t(CHECK_TYPES.find((c) => c.v === checkType)?.label || '')}{required ? ` · ${t('Обязательный')}` : ''}</div>
            <div className="text-gray-500 dark:text-gray-400">{t('Фото')}: {photoRequired ? `${t('обязательно')} (${photoMin}–${photoMax})` : t('нет')}</div>
            {instruction && <div className="text-gray-500 dark:text-gray-400 line-clamp-3 pt-1">{instruction}</div>}
            <div className="text-gray-400 pt-1">{t('Вес')}: {weight} · {normativeDoc}{normativeSection ? ` п. ${normativeSection}` : ''}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
