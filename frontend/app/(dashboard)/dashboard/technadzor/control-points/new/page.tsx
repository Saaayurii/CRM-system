'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useAuthStore } from '@/stores/authStore';
import { useT } from '@/lib/i18n';

interface Pin { n: number; x: number; y: number; label?: string; color?: string }

interface TypicalDefect {
  name: string;
  code?: string;
  category?: string;
  defectType?: string;
  criticality?: number;
  weight?: number;
  blocksAcceptance?: boolean;
  blocksOperation?: boolean;
  requiresFix?: boolean;
  photoRequired?: boolean;
  requiresSchemeMark?: boolean;
  photoMin?: number;
  photoMax?: number;
  description?: string;
  recommendation?: string;
}

const inputCls = 'w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100';
const lbl = 'block text-xs text-gray-500 dark:text-gray-400 mb-1';

function Toggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <button onClick={() => set(!on)} className={`relative w-10 h-6 rounded-full transition shrink-0 ${on ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`} />
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
      <h3 className="text-xs uppercase tracking-wide font-semibold text-violet-500 mb-4">{t(title)}</h3>
      {children}
    </div>
  );
}

const emptyDefect = (): TypicalDefect => ({
  name: '', code: '', category: '', defectType: '', criticality: 2, weight: 10,
  blocksAcceptance: false, blocksOperation: false, requiresFix: true,
  photoRequired: true, requiresSchemeMark: false, photoMin: 1, photoMax: 5,
  description: '', recommendation: '',
});

interface StatusText { text: string; use: boolean; importance: string }

const DEFAULT_REPORT_BLOCKS: Array<{ key: string; label: string; on: boolean }> = [
  { key: 'cover', label: 'Титульная страница', on: true },
  { key: 'object', label: 'Данные объекта', on: true },
  { key: 'inspection', label: 'Данные проверки', on: true },
  { key: 'summary', label: 'Сводная статистика', on: true },
  { key: 'checks', label: 'Список проверок и дефектов', on: true },
  { key: 'photos', label: 'Фотофиксация', on: true },
  { key: 'remarks', label: 'Замечания и рекомендации', on: true },
  { key: 'signatures', label: 'Подписи', on: true },
];
const REPORT_FORMATS = [
  { v: 'pdf', label: 'PDF', hint: 'Для печати и отправки' },
  { v: 'docx', label: 'DOCX', hint: 'Для редактирования' },
  { v: 'xlsx', label: 'XLSX', hint: 'Для анализа данных' },
];
const REPORT_FONTS = ['Inter', 'Roboto', 'Arial', 'Times New Roman'];

const COMPAT_OPTIONS = [
  'Приёмка квартиры', 'Технический надзор', 'Гарантийный осмотр',
  'Исполнительная документация', 'Периодический осмотр', 'Аудит качества',
];

const STATUS_DEFS: Array<{ k: 'ok' | 'note' | 'fail'; label: string; code: string; color: string; icon: string }> = [
  { k: 'ok', label: 'Соответствует', code: 'OK', color: 'green', icon: '✓' },
  { k: 'note', label: 'С замечаниями', code: 'NOTE', color: 'yellow', icon: '!' },
  { k: 'fail', label: 'Не соответствует', code: 'FAIL', color: 'red', icon: '✕' },
];
const IMPORTANCE = [
  { v: 'info', label: 'Информационный' },
  { v: 'note', label: 'Замечание' },
  { v: 'critical', label: 'Критичный' },
];
const TEXT_VARS: Array<{ token: string; label: string }> = [
  { token: '{object_name}', label: 'Название объекта' },
  { token: '{room_name}', label: 'Название помещения' },
  { token: '{address}', label: 'Адрес объекта' },
  { token: '{inspection_date}', label: 'Дата проверки' },
  { token: '{inspector_name}', label: 'ФИО инспектора' },
  { token: '{company_name}', label: 'Название компании' },
  { token: '{defect_name}', label: 'Название дефекта' },
  { token: '{criticality}', label: 'Критичность' },
  { token: '{normative}', label: 'Нормативный документ' },
  { token: '{recommendation}', label: 'Рекомендация' },
  { token: '{location}', label: 'Расположение' },
];
const SAMPLE_VARS: Record<string, string> = {
  '{object_name}': 'ЖК «Солнечный», корпус 2',
  '{room_name}': 'Кухня',
  '{address}': 'г. Москва, ул. Лесная, 15',
  '{inspection_date}': '21.05.2024',
  '{inspector_name}': 'Иванов И.И.',
  '{company_name}': 'ООО «ТехКонтроль»',
  '{defect_name}': 'Царапина на стеклопакете',
  '{criticality}': 'Высокая',
  '{normative}': 'ГОСТ 30674-2013',
  '{recommendation}': 'Замена стеклопакета',
  '{location}': 'Окно W-01',
};

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
const STEP_SUB: Record<number, string> = {
  1: 'Создайте новый пункт проверки и задайте его основные параметры',
  2: 'Добавьте типовые дефекты, которые могут быть выявлены по данному пункту',
  3: 'Настройте шаблоны текстов для разных статусов проверки',
  4: 'Настройте структуру и внешний вид отчёта по данной проверке',
  5: 'Опубликуйте пункт и сделайте его доступным для использования',
};

export default function ControlPointBuilderPage() {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');
  const addToast = useToastStore((s) => s.addToast);
  const authUser = useAuthStore((s) => s.user);
  const authorName = authUser ? (authUser.name || authUser.email || `#${authUser.id}`) : undefined;
  const [step, setStep] = useState(Number(params.get('step')) || 1);

  // Шаг 2 — типовые дефекты
  const [defects, setDefects] = useState<TypicalDefect[]>([]);
  const [selDefect, setSelDefect] = useState(0);

  // Шаг 3 — шаблоны текстов
  const [statusTexts, setStatusTexts] = useState<Record<string, StatusText>>({
    ok: { text: '', use: true, importance: 'info' },
    note: { text: '', use: true, importance: 'note' },
    fail: { text: '', use: true, importance: 'critical' },
  });
  const [defectTexts, setDefectTexts] = useState<Array<{ name: string; description: string }>>([]);
  const [previewStatus, setPreviewStatus] = useState<'ok' | 'note' | 'fail'>('fail');
  const lastFocused = useRef<'ok' | 'note' | 'fail' | null>(null);
  const textRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Шаг 4 — настройки отчёта
  const [reportFormat, setReportFormat] = useState('pdf');
  const [reportBlocks, setReportBlocks] = useState<Array<{ key: string; label: string; on: boolean }>>(DEFAULT_REPORT_BLOCKS);
  const [primaryColor, setPrimaryColor] = useState('#6C4DFF');
  const [textColor, setTextColor] = useState('#1A1F2C');
  const [reportFont, setReportFont] = useState('Inter');
  const [reportFontSize, setReportFontSize] = useState(12);
  const [showPageNumbers, setShowPageNumbers] = useState(true);

  // Шаг 5 — публикация
  const [scope, setScope] = useState('company'); // company | project | division
  const [compat, setCompat] = useState<string[]>(['Технический надзор', 'Приёмка квартиры']);
  const [versionComment, setVersionComment] = useState('Первоначальная версия пункта');
  const [pubComment, setPubComment] = useState('');
  const [allowEditAfter, setAllowEditAfter] = useState(true);
  const [notifyOnUse, setNotifyOnUse] = useState(false);
  const [autoUpdateTemplates, setAutoUpdateTemplates] = useState(true);
  const [versions, setVersions] = useState<Array<{ version: string; date: string; author?: string; comment?: string }>>([]);

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
      setDefects(Array.isArray(data.typicalDefects) ? data.typicalDefects : []);
      const tt = data.textTemplates || {};
      if (tt.statuses) setStatusTexts((prev) => ({ ...prev, ...tt.statuses }));
      setDefectTexts(Array.isArray(tt.defectTemplates) ? tt.defectTemplates : []);
      const rs = data.reportSettings || {};
      if (rs.format) setReportFormat(rs.format);
      if (Array.isArray(rs.blocks) && rs.blocks.length) setReportBlocks(rs.blocks);
      if (rs.primaryColor) setPrimaryColor(rs.primaryColor);
      if (rs.textColor) setTextColor(rs.textColor);
      if (rs.font) setReportFont(rs.font);
      if (rs.fontSize) setReportFontSize(rs.fontSize);
      if (typeof rs.showPageNumbers === 'boolean') setShowPageNumbers(rs.showPageNumbers);
      const pub = data.publication || {};
      if (pub.scope) setScope(pub.scope);
      if (Array.isArray(pub.compat)) setCompat(pub.compat);
      if (pub.versionComment) setVersionComment(pub.versionComment);
      if (pub.pubComment) setPubComment(pub.pubComment);
      if (typeof pub.allowEditAfter === 'boolean') setAllowEditAfter(pub.allowEditAfter);
      if (typeof pub.notifyOnUse === 'boolean') setNotifyOnUse(pub.notifyOnUse);
      if (typeof pub.autoUpdateTemplates === 'boolean') setAutoUpdateTemplates(pub.autoUpdateTemplates);
      setVersions(Array.isArray(data.versions) ? data.versions : []);
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
    typicalDefects: defects.filter((d) => d.name.trim()),
    textTemplates: {
      statuses: statusTexts,
      defectTemplates: defectTexts.filter((d) => d.name.trim()),
    },
    reportSettings: {
      format: reportFormat, blocks: reportBlocks,
      primaryColor, textColor, font: reportFont, fontSize: reportFontSize, showPageNumbers,
    },
    publication: {
      scope, compat, versionComment, pubComment,
      allowEditAfter, notifyOnUse, autoUpdateTemplates,
    },
    versions,
  });

  // Создать новую версию: текущую кладём в историю, бампим минорную версию
  const createNewVersion = async () => {
    if (!editId) { addToast('warning', 'Сначала сохраните пункт'); return; }
    const parts = version.split('.');
    const minor = (parseInt(parts[1] ?? '0', 10) || 0) + 1;
    const next = `${parts[0] || '1'}.${minor}`;
    const historyEntry = { version, date: new Date().toISOString(), author: authorName, comment: versionComment || undefined };
    const newVersions = [historyEntry, ...versions];
    setSaving(true);
    try {
      await api.put(`/control-points/${editId}`, { ...buildPayload(status), versions: newVersions, version: next });
      setVersions(newVersions);
      setVersion(next);
      addToast('success', `Создана версия ${next}`);
    } catch { addToast('error', 'Не удалось создать версию'); }
    finally { setSaving(false); }
  };

  const moveBlock = (i: number, dir: -1 | 1) => setReportBlocks((bs) => {
    const j = i + dir; if (j < 0 || j >= bs.length) return bs;
    const c = [...bs]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });

  // вставка переменной в активный textarea статуса
  const insertVar = (token: string) => {
    const k = lastFocused.current;
    if (!k) { addToast('warning', 'Сначала кликните в поле текста статуса'); return; }
    const el = textRefs.current[k];
    const cur = statusTexts[k]?.text ?? '';
    const start = el?.selectionStart ?? cur.length;
    const end = el?.selectionEnd ?? cur.length;
    const next = cur.slice(0, start) + token + cur.slice(end);
    setStatusTexts((s) => ({ ...s, [k]: { ...s[k], text: next } }));
  };
  const renderPreview = (text: string) =>
    Object.entries(SAMPLE_VARS).reduce((acc, [tok, val]) => acc.split(tok).join(val), text);

  const save = async (st: string, goNext = false) => {
    if (!name.trim()) { addToast('error', 'Укажите наименование пункта'); return; }
    setSaving(true);
    try {
      const payload = buildPayload(st);
      let id = editId;
      if (editId) await api.put(`/control-points/${editId}`, payload);
      else { const { data } = await api.post('/control-points', payload); id = String(data.id); }
      addToast('success', st === 'active' ? 'Пункт опубликован' : 'Сохранено');
      if (goNext) {
        const next = Math.min(step + 1, STEPS.length);
        if (id) router.replace(`/dashboard/technadzor/control-points/new?id=${id}&step=${next}`);
        setStep(next);
      } else {
        router.push('/dashboard/technadzor/control-points');
      }
    } catch { addToast('error', 'Не удалось сохранить пункт'); }
    finally { setSaving(false); }
  };

  // мутации типовых дефектов
  const updateDefect = (i: number, patch: Partial<TypicalDefect>) =>
    setDefects((ds) => ds.map((d, j) => j === i ? { ...d, ...patch } : d));
  const addDefect = () => { setDefects((ds) => [...ds, emptyDefect()]); setSelDefect(defects.length); };
  const removeDefect = (i: number) => {
    setDefects((ds) => ds.filter((_, j) => j !== i));
    setSelDefect((s) => Math.max(0, s >= i ? s - 1 : s));
  };

  if (loading) {
    return <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto"><div className="animate-pulse h-96 bg-gray-100 dark:bg-gray-800 rounded-2xl" /></div>;
  }

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
          <span className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold">{step}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t(STEPS[step - 1]?.label || 'Создание пункта')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t(STEP_SUB[step] || '')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/technadzor/control-points" className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50">{t('Отмена')}</Link>
          <button onClick={() => save('draft')} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50">{t('Сохранить черновик')}</button>
          {step < STEPS.length ? (
            <button onClick={() => save('draft', true)} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50">{t('Сохранить и далее')} →</button>
          ) : (
            <button onClick={() => save('active')} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">{t('Опубликовать пункт')}</button>
          )}
        </div>
      </div>

      {/* Степпер */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
        {STEPS.map((s) => {
          const clickable = s.n === 1 || !!editId;
          return (
            <button
              key={s.n}
              onClick={() => clickable && setStep(s.n)}
              disabled={!clickable}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm shrink-0 ${step === s.n ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium' : 'text-gray-400'} ${clickable ? 'hover:text-gray-600 dark:hover:text-gray-200' : 'opacity-50 cursor-not-allowed'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === s.n ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{s.n}</span>
              {t(s.label)}
            </button>
          );
        })}
      </div>

      {step === 1 && (
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
      )}

      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Список дефектов */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase tracking-wide font-semibold text-violet-500">{t('Список дефектов')}</h3>
              <button onClick={addDefect} className="text-sm text-violet-600 dark:text-violet-400 hover:underline">+ {t('Добавить')}</button>
            </div>
            {defects.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">{t('Дефектов нет')}</p>
            ) : (
              <ul className="space-y-1">
                {defects.map((d, i) => {
                  const cr = d.criticality != null ? CRITICALITY.find((c) => c.v === d.criticality) : undefined;
                  return (
                    <li key={i}>
                      <button onClick={() => setSelDefect(i)} className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-2 ${i === selDefect ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                        <span className="min-w-0">
                          <span className="block text-sm text-gray-800 dark:text-gray-100 truncate">{d.name || t('Без названия')}</span>
                          <span className="block text-xs text-gray-400 font-mono">{d.code || '—'}</span>
                        </span>
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${d.criticality === 4 || d.criticality === 3 ? 'bg-red-500' : d.criticality === 2 ? 'bg-yellow-500' : 'bg-green-500'}`} title={cr ? t(cr.label) : ''} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Параметры дефекта */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
            {defects[selDefect] ? (() => {
              const d = defects[selDefect];
              const set = (patch: Partial<TypicalDefect>) => updateDefect(selDefect, patch);
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs uppercase tracking-wide font-semibold text-violet-500">{t('Параметры дефекта')}</h3>
                    <button onClick={() => removeDefect(selDefect)} className="text-red-400 hover:text-red-600 text-sm">{t('Удалить')}</button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className={lbl}>{t('Название дефекта')} *</label><input value={d.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} /></div>
                    <div><label className={lbl}>{t('Код дефекта')}</label><input value={d.code ?? ''} onChange={(e) => set({ code: e.target.value })} className={inputCls} placeholder="WIN-001-DEF-001" /></div>
                    <div><label className={lbl}>{t('Категория')}</label><input value={d.category ?? ''} onChange={(e) => set({ category: e.target.value })} className={inputCls} placeholder={t('Внешний вид')} /></div>
                    <div><label className={lbl}>{t('Тип дефекта')}</label><input value={d.defectType ?? ''} onChange={(e) => set({ defectType: e.target.value })} className={inputCls} placeholder={t('Повреждение поверхности')} /></div>
                    <div>
                      <label className={lbl}>{t('Критичность')}</label>
                      <select value={d.criticality ?? 2} onChange={(e) => set({ criticality: Number(e.target.value) })} className={inputCls}>
                        {CRITICALITY.map((c) => <option key={c.v} value={c.v}>{t(c.label)}</option>)}
                      </select>
                    </div>
                    <div><label className={lbl}>{t('Вес дефекта (для рейтинга)')}</label><input type="number" value={d.weight ?? 0} onChange={(e) => set({ weight: Number(e.target.value) })} className={inputCls} /></div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      { k: 'blocksAcceptance', label: 'Блокирует приёмку' },
                      { k: 'blocksOperation', label: 'Блокирует эксплуатацию' },
                      { k: 'requiresFix', label: 'Требует устранения' },
                      { k: 'photoRequired', label: 'Фото обязательно' },
                      { k: 'requiresSchemeMark', label: 'Отметка на схеме' },
                    ] as const).map((row) => (
                      <label key={row.k} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2">
                        <span className="text-sm text-gray-700 dark:text-gray-200">{t(row.label)}</span>
                        <Toggle on={!!d[row.k]} set={(v) => set({ [row.k]: v } as Partial<TypicalDefect>)} />
                      </label>
                    ))}
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={lbl}>{t('Фото мин')}</label><input type="number" value={d.photoMin ?? 0} onChange={(e) => set({ photoMin: Number(e.target.value) })} className={inputCls} /></div>
                      <div><label className={lbl}>{t('Фото макс')}</label><input type="number" value={d.photoMax ?? 0} onChange={(e) => set({ photoMax: Number(e.target.value) })} className={inputCls} /></div>
                    </div>
                  </div>

                  <div><label className={lbl}>{t('Описание дефекта (в отчёте)')}</label><textarea value={d.description ?? ''} onChange={(e) => set({ description: e.target.value })} rows={3} className={inputCls} /></div>
                  <div><label className={lbl}>{t('Рекомендации по устранению')}</label><textarea value={d.recommendation ?? ''} onChange={(e) => set({ recommendation: e.target.value })} rows={2} className={inputCls} /></div>
                </div>
              );
            })() : (
              <div className="py-12 text-center text-sm text-gray-400">{t('Добавьте дефект или выберите из списка')}</div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Тексты по статусам */}
          <div className="lg:col-span-2 space-y-4">
            <Card title="Шаблоны текстов по статусам проверки">
              <div className="space-y-4">
                {STATUS_DEFS.map((s) => {
                  const v = statusTexts[s.k];
                  return (
                    <div key={s.k} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
                          <span className={`w-5 h-5 rounded-full text-white text-xs flex items-center justify-center bg-${s.color}-500`} style={{ background: s.color === 'green' ? '#22c55e' : s.color === 'yellow' ? '#eab308' : '#ef4444' }}>{s.icon}</span>
                          {t(s.label)} <span className="text-xs text-gray-400">({s.code})</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <select value={v.importance} onChange={(e) => setStatusTexts((st) => ({ ...st, [s.k]: { ...st[s.k], importance: e.target.value } }))} className="text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-gray-700 dark:text-gray-200">
                            {IMPORTANCE.map((im) => <option key={im.v} value={im.v}>{t(im.label)}</option>)}
                          </select>
                          <Toggle on={v.use} set={(on) => setStatusTexts((st) => ({ ...st, [s.k]: { ...st[s.k], use: on } }))} />
                        </span>
                      </div>
                      <textarea
                        ref={(el) => { textRefs.current[s.k] = el; }}
                        value={v.text}
                        onFocus={() => { lastFocused.current = s.k; }}
                        onChange={(e) => setStatusTexts((st) => ({ ...st, [s.k]: { ...st[s.k], text: e.target.value } }))}
                        rows={3}
                        placeholder={t('Текст, который подставится в отчёт при этом статусе…')}
                        className={inputCls}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Шаблоны текстов для дефектов */}
            <Card title="Шаблоны текстов для дефектов">
              <div className="space-y-2">
                {defectTexts.length === 0 && <p className="text-sm text-gray-400">{t('Нет шаблонов')}</p>}
                {defectTexts.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={d.name} onChange={(e) => setDefectTexts((ds) => ds.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder={t('Название шаблона')} className={`${inputCls} w-1/3`} />
                    <input value={d.description} onChange={(e) => setDefectTexts((ds) => ds.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder={t('Описание / текст')} className={inputCls} />
                    <button onClick={() => setDefectTexts((ds) => ds.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 shrink-0">✕</button>
                  </div>
                ))}
                <button onClick={() => setDefectTexts((ds) => [...ds, { name: '', description: '' }])} className="w-full py-2 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg">+ {t('Добавить шаблон текста')}</button>
              </div>
            </Card>
          </div>

          {/* Переменные + предпросмотр */}
          <div className="space-y-4">
            <Card title="Доступные переменные">
              <p className="text-xs text-gray-400 mb-3">{t('Кликните в поле текста, затем по переменной — она вставится в позицию курсора')}</p>
              <div className="flex flex-wrap gap-1.5">
                {TEXT_VARS.map((v) => (
                  <button key={v.token} onClick={() => insertVar(v.token)} title={t(v.label)} className="px-2 py-1 rounded-lg text-xs font-mono bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-500/25">
                    {v.token}
                  </button>
                ))}
              </div>
            </Card>

            <Card title="Предпросмотр шаблона">
              <select value={previewStatus} onChange={(e) => setPreviewStatus(e.target.value as 'ok' | 'note' | 'fail')} className={`${inputCls} mb-3`}>
                {STATUS_DEFS.map((s) => <option key={s.k} value={s.k}>{t(s.label)}</option>)}
              </select>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap min-h-[80px]">
                {renderPreview(statusTexts[previewStatus]?.text || '') || <span className="text-gray-400">{t('Текст не задан')}</span>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-4">
            <Card title="Формат отчёта">
              <div className="grid grid-cols-3 gap-2">
                {REPORT_FORMATS.map((f) => (
                  <button key={f.v} onClick={() => setReportFormat(f.v)} className={`text-left p-3 rounded-xl border ${reportFormat === f.v ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : 'border-gray-200 dark:border-gray-600'}`}>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{f.label}</div>
                    <div className="text-[11px] text-gray-400">{t(f.hint)}</div>
                  </button>
                ))}
              </div>
            </Card>

            <Card title="Структура отчёта">
              <ul className="space-y-1.5">
                {reportBlocks.map((b, i) => (
                  <li key={b.key} className="flex items-center gap-2 rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2">
                    <span className="flex-1 text-sm text-gray-800 dark:text-gray-100">{i + 1}. {t(b.label)}</span>
                    <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">▲</button>
                    <button onClick={() => moveBlock(i, 1)} disabled={i === reportBlocks.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30">▼</button>
                    <Toggle on={b.on} set={(on) => setReportBlocks((bs) => bs.map((x, j) => j === i ? { ...x, on } : x))} />
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Оформление отчёта">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>{t('Основной цвет')}</label>
                    <div className="flex items-center gap-2"><input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-9 h-9 rounded border border-gray-200 dark:border-gray-600 bg-transparent" /><input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className={inputCls} /></div>
                  </div>
                  <div>
                    <label className={lbl}>{t('Цвет текста')}</label>
                    <div className="flex items-center gap-2"><input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-9 h-9 rounded border border-gray-200 dark:border-gray-600 bg-transparent" /><input value={textColor} onChange={(e) => setTextColor(e.target.value)} className={inputCls} /></div>
                  </div>
                  <div>
                    <label className={lbl}>{t('Шрифт')}</label>
                    <select value={reportFont} onChange={(e) => setReportFont(e.target.value)} className={inputCls}>{REPORT_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}</select>
                  </div>
                  <div><label className={lbl}>{t('Размер шрифта')}</label><input type="number" value={reportFontSize} onChange={(e) => setReportFontSize(Number(e.target.value))} className={inputCls} /></div>
                </div>
                <label className="flex items-center justify-between"><span className="text-sm text-gray-700 dark:text-gray-200">{t('Показывать номера страниц')}</span><Toggle on={showPageNumbers} set={setShowPageNumbers} /></label>
              </div>
            </Card>
          </div>

          {/* Предпросмотр отчёта */}
          <Card title="Предпросмотр отчёта">
            <div className="rounded-xl bg-white border border-gray-200 p-5 text-[13px]" style={{ color: textColor, fontFamily: reportFont, fontSize: reportFontSize }}>
              <div className="flex items-center justify-between border-b pb-3 mb-3" style={{ borderColor: primaryColor }}>
                <span className="font-bold" style={{ color: primaryColor }}>{name || 'ТехКонтроль'}</span>
                <span className="text-gray-500 text-xs">{t('ОТЧЁТ по результатам инспекции')}</span>
              </div>
              {reportBlocks.filter((b) => b.on).map((b, i) => (
                <div key={b.key} className="mb-2">
                  <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: primaryColor }}>{i + 1}. {t(b.label)}</div>
                  <div className="h-6 rounded bg-gray-100 mt-1" />
                </div>
              ))}
              {showPageNumbers && <div className="text-center text-[10px] text-gray-400 mt-3">— 1 —</div>}
            </div>
            <p className="text-xs text-gray-400 mt-2">{t('Формат экспорта')}: {reportFormat.toUpperCase()}{reportFormat !== 'pdf' ? ` (${t('подключим позже')})` : ''}</p>
          </Card>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card title="Область действия">
              <div className="space-y-2">
                {([
                  { v: 'company', label: 'Вся компания', hint: 'Доступен всем пользователям компании' },
                  { v: 'project', label: 'Конкретный проект', hint: 'Выберите проекты' },
                  { v: 'division', label: 'Подразделение', hint: 'Выберите подразделение' },
                ] as const).map((o) => (
                  <label key={o.v} className={`flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer ${scope === o.v ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : 'border-gray-200 dark:border-gray-600'}`}>
                    <input type="radio" checked={scope === o.v} onChange={() => setScope(o.v)} className="mt-1" />
                    <span><span className="block text-sm text-gray-800 dark:text-gray-100">{t(o.label)}</span><span className="block text-xs text-gray-400">{t(o.hint)}</span></span>
                  </label>
                ))}
              </div>
            </Card>

            <Card title="Совместимость с инспекциями">
              <div className="space-y-2">
                {COMPAT_OPTIONS.map((c) => {
                  const on = compat.includes(c);
                  return (
                    <label key={c} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer">
                      <input type="checkbox" checked={on} onChange={(e) => setCompat((cs) => e.target.checked ? [...cs, c] : cs.filter((x) => x !== c))} />
                      {t(c)}
                    </label>
                  );
                })}
              </div>
            </Card>

            <Card title="Версионирование">
              <div className="space-y-3">
                <div><label className={lbl}>{t('Текущая версия')}</label><input value={version} onChange={(e) => setVersion(e.target.value)} className={inputCls} /></div>
                <div><label className={lbl}>{t('Комментарий к версии')}</label><textarea value={versionComment} onChange={(e) => setVersionComment(e.target.value)} rows={2} className={inputCls} /></div>
                <button onClick={createNewVersion} disabled={saving || !editId} className="w-full py-2 rounded-lg text-sm font-medium border border-violet-300 text-violet-600 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10 disabled:opacity-50">{t('Создать новую версию')}</button>
                {versions.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">{t('История версий')}</div>
                    <ol className="space-y-2">
                      {versions.map((v, i) => (
                        <li key={i} className="text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-200">v{v.version}</span>
                          <span className="text-xs text-gray-400 ml-2">{new Date(v.date).toLocaleDateString('ru-RU')}{v.author ? ` · ${v.author}` : ''}</span>
                          {v.comment && <span className="block text-xs text-gray-500 dark:text-gray-400">{v.comment}</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="Дополнительные настройки публикации">
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-3"><span className="text-sm text-gray-700 dark:text-gray-200">{t('Разрешить редактирование после публикации')}</span><Toggle on={allowEditAfter} set={setAllowEditAfter} /></label>
                <label className="flex items-center justify-between gap-3"><span className="text-sm text-gray-700 dark:text-gray-200">{t('Уведомлять об использовании')}</span><Toggle on={notifyOnUse} set={setNotifyOnUse} /></label>
                <label className="flex items-center justify-between gap-3"><span className="text-sm text-gray-700 dark:text-gray-200">{t('Автоматически обновлять в шаблонах')}</span><Toggle on={autoUpdateTemplates} set={setAutoUpdateTemplates} /></label>
                <div><label className={lbl}>{t('Комментарий к публикации')}</label><textarea value={pubComment} onChange={(e) => setPubComment(e.target.value)} rows={2} className={inputCls} /></div>
              </div>
            </Card>

            <Card title="Что произойдёт при публикации">
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {t('Пункт станет доступен для создания инспекций')}</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {t('Появится в библиотеке, поиске и фильтрах')}</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {t('Будет добавлен в выбранные шаблоны инспекций')}</li>
                <li className="flex items-center gap-2 text-amber-600 dark:text-amber-400"><span>⚠</span> {t('После публикации пункт можно только архивировать')}</li>
              </ul>
            </Card>
          </div>

          {/* Финальная проверка */}
          <Card title="Финальная проверка перед публикацией">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
              {[
                { ok: !!name.trim(), label: 'Основная информация' },
                { ok: defects.filter((d) => d.name.trim()).length > 0, label: `Типовые дефекты (${defects.filter((d) => d.name.trim()).length})` },
                { ok: Object.values(statusTexts).some((s) => s.text.trim()), label: 'Шаблоны текстов' },
                { ok: reportBlocks.some((b) => b.on), label: 'Настройки отчёта' },
                { ok: !!normativeDoc.trim(), label: 'Нормативы указаны' },
              ].map((c, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${c.ok ? 'border-green-200 dark:border-green-900' : 'border-amber-200 dark:border-amber-900'}`}>
                  <span className={c.ok ? 'text-green-500' : 'text-amber-500'}>{c.ok ? '✓' : '!'}</span>
                  <span className="text-gray-700 dark:text-gray-200">{t(c.label)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
