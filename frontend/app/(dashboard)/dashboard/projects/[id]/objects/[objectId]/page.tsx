'use client';

/**
 * Object Technical Passport ("Технический паспорт объекта").
 * Shell page: header + completion meter + section navigation. Each section is a
 * self-contained component under ./passport/sections reading/writing its slice
 * of the passport JSONB through the shared PassportCtx (see usePassport.ts).
 */

import { useEffect, useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import TasksPanel from '@/components/dashboard/TasksPanel';
import { usePassport } from './passport/usePassport';
import { sectionCompletion, overallCompletion, SITE_STATUS_LABEL } from './passport/types';

import GeneralSection from './passport/sections/GeneralSection';
import AccessSecuritySection from './passport/sections/AccessSecuritySection';
import EngineeringSection from './passport/sections/EngineeringSection';
import InfrastructureSection from './passport/sections/InfrastructureSection';
import SecuritySection from './passport/sections/SecuritySection';
import RoomsSection from './passport/sections/RoomsSection';
import DocumentsSection from './passport/sections/DocumentsSection';
import MaintenanceSection from './passport/sections/MaintenanceSection';
import ContactsSection from './passport/sections/ContactsSection';
import PhotosSection from './passport/sections/PhotosSection';
import HistorySection from './passport/sections/HistorySection';
import { useT } from '@/lib/i18n';

type SectionKey =
  | 'general' | 'access' | 'engineering' | 'infrastructure' | 'security'
  | 'rooms' | 'documents' | 'maintenance' | 'contacts' | 'photos' | 'history' | 'tasks';

const I = (path: string) => (p: { className?: string }) => (
  <svg className={p.className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const NAV: { key: SectionKey; label: string; subtitle: string; Icon: (p: { className?: string }) => ReactElement; chip?: boolean }[] = [
  { key: 'general', label: 'Общая информация', subtitle: 'Основные данные, собственник, УК', chip: true, Icon: I('M3.75 12h16.5M3.75 6.75h16.5M3.75 17.25h16.5') },
  { key: 'access', label: 'Доступ и безопасность', subtitle: 'Ключи, коды, пропуска, режим доступа', chip: true, Icon: I('M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z') },
  { key: 'engineering', label: 'Инженерные системы', subtitle: 'Электрика, вода, отопление, газ и др.', chip: true, Icon: I('M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z') },
  { key: 'infrastructure', label: 'Инфраструктура и сети', subtitle: 'Интернет, Wi-Fi, серверы, телефония', chip: true, Icon: I('M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z') },
  { key: 'security', label: 'Безопасность и охрана', subtitle: 'Сигнализация, видеонаблюдение, СКУД', chip: true, Icon: I('M9 12.75L11.25 15 15 9.75M21 12c0 4.97-3.582 9.18-8.252 9.93a.75.75 0 01-.496 0C7.582 21.18 4 16.97 4 12V6.06a.75.75 0 01.546-.721l7-2a.75.75 0 01.408 0l7 2A.75.75 0 0120 6.06V12z') },
  { key: 'rooms', label: 'Помещения', subtitle: 'Комнаты, площади, планы, отделка', chip: true, Icon: I('M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75') },
  { key: 'documents', label: 'Документы и файлы', subtitle: 'Проекты, договоры, акты, инструкции', chip: true, Icon: I('M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z') },
  { key: 'maintenance', label: 'Обслуживание и гарантия', subtitle: 'История работ, гарантия на оборудование', chip: true, Icon: I('M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085') },
  { key: 'contacts', label: 'Контакты', subtitle: 'Все ответственные лица и службы', chip: true, Icon: I('M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z') },
  { key: 'photos', label: 'Фото узлов и оборудования', subtitle: 'Счётчики, щиты, котёл, роутер и др.', Icon: I('M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316zM16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z') },
  { key: 'history', label: 'История изменений', subtitle: 'Все изменения паспорта объекта', Icon: I('M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z') },
  { key: 'tasks', label: 'Задачи', subtitle: 'Задачи по объекту', Icon: I('M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z') },
];

export default function ObjectPassportPage() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);
  const objectId = Number(params.objectId);
  const ctx = usePassport(projectId, objectId);

  const [active, setActive] = useState<SectionKey>('general');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [project, setProject] = useState<{ id: number; name: string; code?: string } | null>(null);
  const [roomsCount, setRoomsCount] = useState(0);
  const [docsCount, setDocsCount] = useState(0);

  useEffect(() => {
    api.get(`/projects/${projectId}`).then((r) => setProject(r.data)).catch(() => {});
  }, [projectId]);

  const refreshCounts = useCallback(() => {
    api.get('/objects', { params: { constructionSiteId: objectId, limit: 1 } })
      .then((r) => setRoomsCount(r.data?.total ?? (Array.isArray(r.data) ? r.data.length : 0))).catch(() => {});
    api.get('/documents', { params: { constructionSiteId: objectId, limit: 1 } })
      .then((r) => setDocsCount(r.data?.total ?? (Array.isArray(r.data?.data) ? r.data.data.length : (Array.isArray(r.data) ? r.data.length : 0)))).catch(() => {});
  }, [objectId]);
  useEffect(() => { refreshCounts(); }, [refreshCounts]);

  const completion = sectionCompletion(ctx.passport, roomsCount, docsCount);
  const overall = overallCompletion(completion);

  if (ctx.loading) {
    return <div className="flex items-center justify-center min-h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" /></div>;
  }
  if (!ctx.site) return null;

  const site = ctx.site;
  const statusInfo = SITE_STATUS_LABEL[site.status ?? 0] ?? SITE_STATUS_LABEL[0];
  const areaLabel = site.areaSize != null ? `${site.areaSize} м²` : '';
  const activeItem = NAV.find((n) => n.key === active) ?? NAV[0];

  const navButton = (item: typeof NAV[number], onPick?: () => void) => {
    const { key, label, subtitle, Icon, chip } = item;
    const c = chip ? completion[key === 'rooms' ? 'rooms' : key] : undefined;
    const isActive = active === key;
    return (
      <button key={key} onClick={() => { setActive(key); onPick?.(); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${isActive ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/30'}`}>
        <Icon className="w-5 h-5 shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium truncate">{label}</span>
          <span className="block text-[11px] text-gray-400 dark:text-gray-500 truncate">{subtitle}</span>
        </span>
        {c && <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">{Math.min(c.done, c.total)}/{c.total}</span>}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb + header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2 flex-wrap">
            <button onClick={() => router.push('/dashboard/projects')} className="hover:text-violet-500 transition-colors">{t('Проекты')}</button>
            <span>/</span>
            <button onClick={() => router.push(`/dashboard/projects/${projectId}?tab=objects`)} className="hover:text-violet-500 transition-colors truncate max-w-[180px]">{project?.name ?? `Проект #${projectId}`}</button>
            <span>/</span>
            <button onClick={() => setActive('general')} className="hover:text-violet-500 transition-colors truncate max-w-[180px]">{site.name}</button>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-200 font-medium truncate max-w-[220px]">{activeItem.label}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{site.name}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
            {areaLabel && <span className="text-sm text-gray-400">{areaLabel}</span>}
          </div>
          {site.address && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{site.address}</p>}
        </div>
        <button onClick={() => router.push(`/dashboard/projects/${projectId}?tab=objects`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-gray-300 transition-colors shrink-0 self-start">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Назад
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* Section nav (desktop) */}
        <aside className="space-y-3 lg:sticky lg:top-4 self-start hidden lg:block">
          <nav className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/60 p-2">
            {NAV.map((item) => navButton(item))}
          </nav>

          {/* Completion meter */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('Заполненность паспорта')}</span>
              <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{overall}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all" style={{ width: `${overall}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{overall === 100 ? 'Все разделы заполнены полностью' : 'Заполните разделы для полного паспорта'}</p>
          </div>
        </aside>

        {/* Section content */}
        <main className="min-w-0">
          {/* Mobile section picker (burger) */}
          <div className="lg:hidden relative mb-4 z-30">
            <button onClick={() => setMobileNavOpen((v) => !v)}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-xl">
              <svg className="w-5 h-5 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" /></svg>
              <span className="flex-1 min-w-0 text-left text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{activeItem.label}</span>
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400 shrink-0">{overall}%</span>
              <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${mobileNavOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </button>

            {/* Slim completion bar always visible under the button */}
            <div className="h-1.5 mt-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all" style={{ width: `${overall}%` }} />
            </div>

            {mobileNavOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMobileNavOpen(false)} />
                <div className="absolute left-0 right-0 mt-2 z-40 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-xl p-2 shadow-xl max-h-[70vh] overflow-y-auto">
                  {NAV.map((item) => navButton(item, () => setMobileNavOpen(false)))}
                </div>
              </>
            )}
          </div>

          {active === 'general' && <GeneralSection ctx={ctx} />}
          {active === 'access' && <AccessSecuritySection ctx={ctx} />}
          {active === 'engineering' && <EngineeringSection ctx={ctx} />}
          {active === 'infrastructure' && <InfrastructureSection ctx={ctx} />}
          {active === 'security' && <SecuritySection ctx={ctx} />}
          {active === 'rooms' && <RoomsSection ctx={ctx} onCountChange={setRoomsCount} />}
          {active === 'documents' && <DocumentsSection ctx={ctx} onCountChange={setDocsCount} />}
          {active === 'maintenance' && <MaintenanceSection ctx={ctx} />}
          {active === 'contacts' && <ContactsSection ctx={ctx} />}
          {active === 'photos' && <PhotosSection ctx={ctx} />}
          {active === 'history' && <HistorySection ctx={ctx} />}
          {active === 'tasks' && <TasksPanel constructionSiteId={objectId} projectId={site.projectId} title={t('Задачи объекта')} />}
        </main>
      </div>
    </div>
  );
}
