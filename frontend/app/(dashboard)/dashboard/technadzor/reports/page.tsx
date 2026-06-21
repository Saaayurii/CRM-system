'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useT } from '@/lib/i18n';
import { DEFECT_STATUS } from '@/components/technadzor/Badge';

interface InspectionLite { id: number; inspectionNumber?: string; inspectionType?: string; }
interface Defect { id: number; defectNumber?: string; title: string; status?: number; severity?: number; }
interface GenFile { filename: string; createdAt?: string; size?: number; }

interface ReportTemplate {
  id: string; icon: string; color: string; title: string; heading: string; desc: string;
  sections: string[];
}
const TEMPLATES: ReportTemplate[] = [
  { id: 'act', icon: '📄', color: 'violet', title: 'Акт осмотра', heading: 'АКТ ОСМОТРА', desc: 'Акт осмотра объекта с перечнем выявленных дефектов',
    sections: ['general', 'results', 'defects', 'photos', 'remarks', 'recommendations', 'signatures'] },
  { id: 'tn', icon: '📋', color: 'blue', title: 'Отчёт технадзора', heading: 'ОТЧЁТ ТЕХНИЧЕСКОГО НАДЗОРА', desc: 'Комплексный отчёт о проведении технического надзора',
    sections: ['general', 'results', 'defects', 'photos', 'remarks', 'recommendations', 'signatures'] },
  { id: 'flat', icon: '📗', color: 'green', title: 'Отчёт приёмки квартиры', heading: 'ОТЧЁТ О ПРИЁМКЕ КВАРТИРЫ', desc: 'Отчёт о приёмке квартиры с результатами проверок',
    sections: ['general', 'results', 'defects', 'photos', 'signatures'] },
  { id: 'warranty', icon: '📙', color: 'orange', title: 'Гарантийный осмотр', heading: 'АКТ ГАРАНТИЙНОГО ОСМОТРА', desc: 'Отчёт по результатам гарантийного осмотра объекта',
    sections: ['general', 'defects', 'photos', 'recommendations', 'signatures'] },
  { id: 'interim', icon: '📘', color: 'teal', title: 'Промежуточный контроль', heading: 'ОТЧЁТ О ПРОМЕЖУТОЧНОМ КОНТРОЛЕ', desc: 'Отчёт о промежуточном контроле на объекте',
    sections: ['general', 'results', 'defects', 'remarks', 'signatures'] },
  { id: 'exec', icon: '📑', color: 'violet', title: 'Исполнительная документация', heading: 'ИСПОЛНИТЕЛЬНАЯ ДОКУМЕНТАЦИЯ', desc: 'Сводный отчёт по исполнительной документации',
    sections: ['general', 'results', 'defects', 'signatures'] },
];
const COLOR_MAP: Record<string, string> = {
  violet: 'bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400',
  blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  teal: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
};
const SECTIONS = [
  { k: 'general', label: 'Общая информация' },
  { k: 'results', label: 'Результаты проверок' },
  { k: 'defects', label: 'Выявленные дефекты' },
  { k: 'photos', label: 'Фотоматериалы' },
  { k: 'remarks', label: 'Замечания' },
  { k: 'recommendations', label: 'Рекомендации' },
  { k: 'signatures', label: 'Подписи' },
];

export default function ReportsPage() {
  const t = useT();
  const addToast = useToastStore((s) => s.addToast);
  const [tab, setTab] = useState<'templates' | 'mine'>('templates');
  const [inspections, setInspections] = useState<InspectionLite[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [template, setTemplate] = useState('act');
  const [sections, setSections] = useState<string[]>(TEMPLATES[0].sections);

  const selectTemplate = (tpl: ReportTemplate) => {
    setTemplate(tpl.id);
    setSections(tpl.sections);
  };
  const [style, setStyle] = useState('standard');
  const [lang, setLang] = useState('ru');
  const [generating, setGenerating] = useState(false);
  const [files, setFiles] = useState<GenFile[]>([]);

  useEffect(() => {
    api.get('/inspections', { params: { limit: 200 } })
      .then(({ data }) => {
        const list: InspectionLite[] = data?.data || data?.items || (Array.isArray(data) ? data : []);
        setInspections(list);
        if (list.length) setSelected(list[0].id);
      })
      .catch(() => {});
  }, []);

  const loadFiles = useCallback(() => {
    api.get('/documents/pdf/list').then(({ data }) => {
      setFiles(Array.isArray(data) ? data : (data?.files || data?.data || []));
    }).catch(() => setFiles([]));
  }, []);
  useEffect(() => { if (tab === 'mine') loadFiles(); }, [tab, loadFiles]);

  const downloadFile = async (filename: string) => {
    try {
      const { data: blob } = await api.get(`/documents/pdf/download/${filename}`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { addToast('error', 'Не удалось скачать файл'); }
  };

  const generate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const { data: insp } = await api.get(`/inspections/${selected}`);
      const defects: Defect[] = Array.isArray(insp.defects) ? insp.defects : [];
      const defectsList = defects.length
        ? defects.map((d) => `• ${d.defectNumber || `DEF-${d.id}`}: ${d.title} (${t((DEFECT_STATUS[d.status ?? 0] ?? DEFECT_STATUS[0]).label)})`).join('\n')
        : 'Дефектов не выявлено';
      const tpl = TEMPLATES.find((x) => x.id === template) ?? TEMPLATES[0];
      const entityData: Record<string, unknown> = {
        sections,
        // заголовок отчёта = название выбранного шаблона
        title: `${tpl.heading}${insp.inspectionNumber ? ` № ${insp.inspectionNumber}` : ''}`,
      };
      if (sections.includes('general')) {
        Object.assign(entityData, {
          inspectionNumber: insp.inspectionNumber, inspectionType: insp.inspectionType,
          status: insp.status, inspectionArea: insp.inspectionArea,
          scheduledDate: insp.scheduledDate, actualDate: insp.actualDate, score: insp.score,
        });
      }
      if (sections.includes('results') || sections.includes('general')) entityData.description = insp.description;
      if (sections.includes('defects')) { entityData.defectsCount = defects.length; entityData.defectsList = defectsList; }
      if (sections.includes('remarks')) entityData.findings = insp.findings;
      if (sections.includes('recommendations')) entityData.recommendations = insp.recommendations;

      const { data: gen } = await api.post('/documents/pdf/generate', {
        entityType: 'inspection', entityId: selected, entityData,
      });
      const { data: blob } = await api.get(`/documents/pdf/download/${gen.filename}`, { responseType: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = gen.filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'Акт осмотра сформирован');
    } catch {
      addToast('error', 'Не удалось сформировать отчёт');
    } finally {
      setGenerating(false);
    }
  };

  const sel = inspections.find((i) => i.id === selected);
  const toggleSection = (k: string) => setSections((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <nav className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
        <Link href="/dashboard/technadzor" className="text-violet-500 hover:text-violet-600">{t('Технадзор')}</Link>
        <span>›</span><span className="text-gray-700 dark:text-gray-200">{t('PDF отчёты')}</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-1">{t('PDF отчёты')}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{t('Генерация и настройка отчётов')}</p>

      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {([{ k: 'templates', label: 'Шаблоны отчётов' }, { k: 'mine', label: 'Мои отчёты' }] as const).map((it) => (
          <button key={it.k} onClick={() => setTab(it.k)} className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${tab === it.k ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>{t(it.label)}</button>
        ))}
      </div>

      {tab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-5">
            {/* Сетка шаблонов */}
            <div>
              <h2 className="text-xs uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-3">{t('Выберите шаблон отчёта')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => selectTemplate(tpl)}
                    className={`relative text-left p-4 rounded-2xl border transition ${template === tpl.id ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-500/5' : 'border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 hover:border-violet-300'}`}
                  >
                    {template === tpl.id && <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center">✓</span>}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2 ${COLOR_MAP[tpl.color]}`}>{tpl.icon}</div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t(tpl.title)}</div>
                    <div className="text-[11px] text-gray-400 mt-1 leading-snug">{t(tpl.desc)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Настройка отчёта */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs space-y-4">
              <h2 className="text-xs uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500">{t('Настройка отчёта')}</h2>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Инспекция')}</label>
                <select value={selected ?? ''} onChange={(e) => setSelected(Number(e.target.value))} className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100">
                  {inspections.length === 0 && <option value="">{t('Нет инспекций')}</option>}
                  {inspections.map((i) => <option key={i.id} value={i.id}>{i.inspectionNumber || `INSP-${i.id}`}{i.inspectionType ? ` — ${i.inspectionType}` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">{t('Разделы отчёта')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {SECTIONS.map((s) => {
                    const on = sections.includes(s.k);
                    return (
                    <button
                      key={s.k}
                      type="button"
                      onClick={() => toggleSection(s.k)}
                      className={`flex items-center gap-2 text-sm rounded-lg border px-3 py-2 text-left transition ${on ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-violet-300'}`}
                    >
                      <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 ${on ? 'bg-violet-600 text-white' : 'border border-gray-300 dark:border-gray-500'}`}>{on ? '✓' : ''}</span>
                      {t(s.label)}
                    </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Оформление')}</label>
                  <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100">
                    <option value="standard">{t('Стандартное')}</option>
                    <option value="compact">{t('Компактное')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('Язык отчёта')}</label>
                  <select value={lang} onChange={(e) => setLang(e.target.value)} className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-800 dark:text-gray-100">
                    <option value="ru">{t('Русский')}</option>
                  </select>
                </div>
              </div>
              <button onClick={generate} disabled={generating || !selected} className="px-5 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 inline-flex items-center gap-2">
                {generating ? t('Формирование…') : t('Сформировать отчёт')}
              </button>
            </div>
          </div>

          {/* Предпросмотр */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-5 shadow-xs">
            <h2 className="text-xs uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-3">{t('Предпросмотр отчёта')}</h2>
            <div className="rounded-xl bg-white border border-gray-200 p-6 text-[13px] text-gray-800 max-h-[600px] overflow-y-auto">
              <div className="text-center mb-4">
                <div className="font-bold text-lg">{t((TEMPLATES.find((x) => x.id === template) ?? TEMPLATES[0]).heading)}</div>
                <div className="text-xs text-gray-500">{sel ? (sel.inspectionNumber || `INSP-${sel.id}`) : '—'}</div>
              </div>
              {sections.includes('general') && (
                <div className="mb-3">
                  <div className="font-semibold text-xs uppercase tracking-wide text-violet-600 mb-1">{t('1. Общая информация')}</div>
                  <div className="h-px bg-gray-200 mb-1" />
                  <div className="text-xs text-gray-500">{t('Тип инспекции')}: {sel?.inspectionType || '—'}</div>
                </div>
              )}
              {sections.includes('results') && <PreviewBlock t={t} title="2. Результаты проверок" />}
              {sections.includes('defects') && <PreviewBlock t={t} title="3. Выявленные дефекты" />}
              {sections.includes('photos') && <PreviewBlock t={t} title="4. Фотоматериалы" />}
              {sections.includes('remarks') && <PreviewBlock t={t} title="Замечания" />}
              {sections.includes('recommendations') && <PreviewBlock t={t} title="Рекомендации" />}
              {sections.includes('signatures') && (
                <div className="mt-6 flex justify-between text-xs text-gray-500">
                  <span>{t('Инспектор')} ____________</span>
                  <span>{t('Заказчик')} ____________</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'mine' && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800 shadow-xs overflow-hidden">
          {files.length === 0 ? (
            <p className="text-sm text-gray-400 p-8 text-center">{t('Сформированных отчётов пока нет')}</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {files.map((f) => (
                <li key={f.filename} className="px-5 py-3 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 min-w-0">
                    <span>📄</span>
                    <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{f.filename}</span>
                  </span>
                  <button onClick={() => downloadFile(f.filename)} className="text-sm text-violet-600 dark:text-violet-400 hover:underline shrink-0">{t('Скачать')}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewBlock({ t, title }: { t: (s: string) => string; title: string }) {
  return (
    <div className="mb-3">
      <div className="font-semibold text-xs uppercase tracking-wide text-violet-600 mb-1">{t(title)}</div>
      <div className="h-px bg-gray-200 mb-1" />
      <div className="h-8 rounded bg-gray-50" />
    </div>
  );
}
