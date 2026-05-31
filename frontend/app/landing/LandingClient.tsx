'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useThemeStore } from '@/stores/themeStore';

/* ────────────────────────────────────────────────────────────────────────
   Иконки (inline SVG — в проекте нет icon-библиотеки)
   ──────────────────────────────────────────────────────────────────────── */
type IconProps = { className?: string };
const I = (path: React.ReactNode) =>
  function Icon({ className = 'w-6 h-6' }: IconProps) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        {path}
      </svg>
    );
  };

const icons = {
  projects: I(<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15l-.75 18h-13.5L4.5 3zm3 4.5h9m-9 4.5h9m-9 4.5h6" />),
  tasks: I(<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />),
  materials: I(<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5 12 3l8.25 4.5M3.75 7.5 12 12m-8.25-4.5v9L12 21m0-9 8.25-4.5M12 12v9m8.25-13.5v9L12 21" />),
  suppliers: I(<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM18.75 18.75a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM3 3.75h1.5l1.5 12h12l1.5-7.5H6" />),
  finance: I(<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m3-9.75a2.25 2.25 0 0 0-2.25-2.25h-1.5A2.25 2.25 0 0 0 9 8.25c0 1.243 1.007 2.25 2.25 2.25h1.5A2.25 2.25 0 0 1 15 12.75 2.25 2.25 0 0 1 12.75 15h-1.5A2.25 2.25 0 0 1 9 12.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />),
  quality: I(<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.96 11.96 0 0 1 3.6 6.13a12 12 0 0 0-.749 4.117c0 5.291 3.617 9.74 8.5 11.04a12 12 0 0 0 8.5-11.04c0-1.427-.25-2.795-.749-4.117a11.96 11.96 0 0 1-8.4-3.417z" />),
  hr: I(<path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.4 9.4 0 0 0 2.625.372 9.34 9.34 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.3 12.3 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0z" />),
  chat: I(<path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.5 48.5 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />),
  calendar: I(<path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0V11.25A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />),
  equipment: I(<path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />),
  documents: I(<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />),
  reports: I(<path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125z" />),
  portal: I(<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />),
  automation: I(<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />),
  wiki: I(<path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />),
  shield: I(<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.96 11.96 0 0 1 3.6 6.13a12 12 0 0 0-.749 4.117c0 5.291 3.617 9.74 8.5 11.04a12 12 0 0 0 8.5-11.04c0-1.427-.25-2.795-.749-4.117a11.96 11.96 0 0 1-8.4-3.417z" />),
  bolt: I(<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />),
  bell: I(<path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.85 23.85 0 0 0 5.454-1.31A8.97 8.97 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.97 8.97 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.26 24.26 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />),
  check: I(<path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />),
  sun: I(<path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z" />),
  moon: I(<path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998z" />),
  menu: I(<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />),
  close: I(<path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />),
  arrow: I(<path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />),
};

/* ────────────────────────────────────────────────────────────────────────
   Данные
   ──────────────────────────────────────────────────────────────────────── */
type Cat = 'Управление' | 'Финансы' | 'Поле' | 'Команда';

const MODULES: { icon: keyof typeof icons; title: string; desc: string; cat: Cat }[] = [
  { icon: 'projects', title: 'Проекты и объекты', desc: 'Стройплощадки, статусы, команды проектов, сроки и прогресс в одном окне.', cat: 'Управление' },
  { icon: 'tasks', title: 'Задачи', desc: 'Постановка, исполнители, приоритеты, история статусов и учёт рабочего времени.', cat: 'Управление' },
  { icon: 'calendar', title: 'Календарь', desc: 'Совещания, дедлайны, инспекции и выезды на объект в общем расписании.', cat: 'Управление' },
  { icon: 'documents', title: 'Документы', desc: 'Проектная документация, шаблоны и генерация PDF из данных системы.', cat: 'Управление' },
  { icon: 'materials', title: 'Материалы и склад', desc: 'Каталог, остатки, склады, заявки на материалы и альтернативные позиции.', cat: 'Финансы' },
  { icon: 'suppliers', title: 'Поставщики', desc: 'Справочник контрагентов, номенклатура с ценами и заказы поставщикам.', cat: 'Финансы' },
  { icon: 'finance', title: 'Финансы и бюджеты', desc: 'Платежи, бюджеты со статьями, акты выполненных работ, зарплата и бонусы.', cat: 'Финансы' },
  { icon: 'reports', title: 'Отчёты и аналитика', desc: 'Шаблоны отчётов, генерация по проекту или компании, экспорт в CSV/PDF.', cat: 'Финансы' },
  { icon: 'quality', title: 'Контроль качества', desc: 'Инспекции по чек-листам, фиксация дефектов с фото и шаблоны проверок.', cat: 'Поле' },
  { icon: 'equipment', title: 'Техника и оборудование', desc: 'Инвентаризация, статусы, привязка к объектам и журнал техобслуживания.', cat: 'Поле' },
  { icon: 'shield', title: 'Охрана труда', desc: 'Журнал инструктажей, напоминания и контроль соответствия по сотрудникам.', cat: 'Поле' },
  { icon: 'hr', title: 'HR и кадры', desc: 'Бригады, табели посещаемости, кадровые документы, отпуска и больничные.', cat: 'Команда' },
  { icon: 'chat', title: 'Корпоративный чат', desc: 'Каналы и личные сообщения в реальном времени, файлы и импорт из Telegram.', cat: 'Команда' },
  { icon: 'wiki', title: 'База знаний и нормы', desc: 'Wiki компании и нормативная база — СНиПы, ГОСТы и СП с поиском.', cat: 'Команда' },
  { icon: 'automation', title: 'Автоматизация', desc: 'Правила «триггер → действие» и журнал выполнения бизнес-процессов.', cat: 'Команда' },
  { icon: 'portal', title: 'Клиентский портал', desc: 'Заказчик видит статус своего проекта в режиме только для чтения.', cat: 'Управление' },
];

const CATS: ('Все' | Cat)[] = ['Все', 'Управление', 'Финансы', 'Поле', 'Команда'];

const PLANS = [
  {
    name: 'Старт',
    price: '4 900',
    period: '₽ / мес',
    tagline: 'Небольшая бригада или один объект',
    featured: false,
    features: ['До 10 пользователей', '1 активная компания', 'Проекты, задачи, материалы', 'Чат и календарь', 'Мобильный доступ (PWA)', 'Поддержка по email'],
    cta: 'Начать',
  },
  {
    name: 'Бизнес',
    price: '12 900',
    period: '₽ / мес',
    tagline: 'Растущая строительная компания',
    featured: true,
    features: ['До 50 пользователей', 'Все модули системы', 'Финансы, бюджеты и отчёты', 'Контроль качества и охрана труда', 'Клиентский портал', 'Автоматизация процессов', 'Приоритетная поддержка'],
    cta: 'Попробовать',
  },
  {
    name: 'Корпоративный',
    price: 'Индивидуально',
    period: '',
    tagline: 'Холдинг или особые требования',
    featured: false,
    features: ['Безлимит пользователей', 'On-premise или своё облако', 'Интеграции по API', 'Выделенный менеджер', 'SLA и обучение команды', 'Кастомизация под процессы'],
    cta: 'Обсудить',
  },
];

const STATS = [
  { value: '23', label: 'модуля в одной системе' },
  { value: '15', label: 'ролей с правами доступа' },
  { value: '99.9%', label: 'аптайм инфраструктуры' },
  { value: '24/7', label: 'доступ с любого устройства' },
];

const SUPPORT_EMAIL = 'support@3stroy15.pro';

/* ────────────────────────────────────────────────────────────────────────
   Компонент
   ──────────────────────────────────────────────────────────────────────── */
export default function LandingClient() {
  const { theme, toggleTheme } = useThemeStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<'Все' | Cat>('Все');

  const shownModules = activeCat === 'Все' ? MODULES : MODULES.filter((m) => m.cat === activeCat);

  const Logo = (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 64 64">
          <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
        </svg>
      </div>
      <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">
        3.15 <span className="text-violet-500">CRM</span>
      </span>
    </div>
  );

  const navLinks = [
    { href: '#modules', label: 'Возможности' },
    { href: '#features', label: 'Как это работает' },
    { href: '#pricing', label: 'Тарифы' },
    { href: '#requests', label: 'Заявки на улучшения' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100 antialiased">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/landing">{Logo}</Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} className="px-3.5 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 rounded-lg transition-colors">
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label="Переключить тему"
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {theme === 'dark' ? <icons.sun className="w-5 h-5" /> : <icons.moon className="w-5 h-5" />}
              </button>
              <Link href="/portal/login" className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                Клиентский портал
              </Link>
              <Link href="/auth/login" className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-gray-900 dark:bg-violet-500 hover:bg-gray-800 dark:hover:bg-violet-600 rounded-lg transition-colors">
                Войти
              </Link>
              <button onClick={() => setMenuOpen((v) => !v)} aria-label="Меню" className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                {menuOpen ? <icons.close className="w-6 h-6" /> : <icons.menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-5 py-4 space-y-1">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                {l.label}
              </a>
            ))}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <Link href="/portal/login" className="text-center px-4 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg">Портал</Link>
              <Link href="/auth/login" className="text-center px-4 py-2.5 text-sm font-semibold text-white bg-violet-500 rounded-lg">Войти</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(124,107,196,0.12),transparent)]" />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 pb-12 lg:pt-24 lg:pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-violet-200/60 dark:ring-violet-500/20">
                <icons.bolt className="w-3.5 h-3.5" /> 23 модуля · одна система
              </span>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.05]">
                Управляйте <span className="text-violet-500">стройкой</span> целиком
              </h1>
              <p className="mt-5 text-lg text-gray-600 dark:text-gray-300 max-w-xl leading-relaxed">
                3.15 CRM объединяет проекты, задачи, материалы, финансы, контроль качества, кадры и общение команды в едином рабочем пространстве — от сметы до сдачи объекта.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/auth/login" className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-violet-500 hover:bg-violet-600 rounded-xl shadow-lg shadow-violet-500/30 transition-colors">
                  Войти в CRM <icons.arrow className="w-4 h-4" />
                </Link>
                <Link href="/portal/login" className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
                  <icons.portal className="w-4 h-4" /> Клиентский портал
                </Link>
              </div>
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Заказчик? Войдите в <a href="/portal/login" className="text-violet-600 dark:text-violet-400 font-medium hover:underline">портал клиента</a>, чтобы следить за своим объектом.
              </p>
            </div>

            {/* Hero visual — макет дашборда */}
            <div className="relative">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shadow-2xl shadow-gray-900/10 dark:shadow-black/40 overflow-hidden">
                <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-3 text-xs text-gray-400">3.15 CRM · Дашборд</span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {['Проекты', 'Задачи', 'Бюджет'].map((k, i) => (
                      <div key={k} className="rounded-xl bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-700">
                        <div className="text-[11px] text-gray-400">{k}</div>
                        <div className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{['12', '184', '87%'][i]}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-end gap-2 h-24">
                      {[40, 65, 50, 80, 60, 95, 72].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t bg-violet-400/70 dark:bg-violet-500/60" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {['Заливка фундамента — секция А', 'Поставка арматуры Ø12', 'Инспекция качества кладки'].map((t, i) => (
                      <div key={t} className="flex items-center gap-3 rounded-lg bg-white dark:bg-gray-800 px-3 py-2.5 border border-gray-100 dark:border-gray-700">
                        <span className={`w-2.5 h-2.5 rounded-full ${['bg-green-400', 'bg-yellow-400', 'bg-violet-400'][i]}`} />
                        <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-5 hidden sm:flex items-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl">
                <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-500/15 flex items-center justify-center text-green-600 dark:text-green-400">
                  <icons.check className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">Объект сдан в срок</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">ЖК «Северный», 4 корпуса</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-200 dark:bg-gray-800">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-950 px-6 py-7 text-center">
                <div className="text-3xl font-extrabold text-violet-500">{s.value}</div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modules (что есть в CRM) ───────────────────────────────────── */}
      <section id="modules" className="max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">Что есть в 3.15 CRM</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl">Все процессы строительной компании в одном месте — выбирайте категорию, чтобы посмотреть нужные модули.</p>
          </div>
        </div>

        {/* Фильтр категорий */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                activeCat === c
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {shownModules.map((m) => {
            const Icon = icons[m.icon];
            return (
              <div key={m.title} className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 hover:border-violet-300 dark:hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/5 transition-all">
                <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="mt-4 font-semibold text-lg text-gray-900 dark:text-white">{m.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works / features ────────────────────────────────────── */}
      <section id="features" className="bg-gray-50 dark:bg-gray-900/50 border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-24">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white text-center">Почему выбирают 3.15 CRM</h2>
          <p className="mt-3 text-center text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Создана для строительной отрасли, а не «универсальная коробка».</p>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { icon: 'shield' as const, title: 'Роли и безопасность', desc: '15 предустановленных ролей, изоляция данных по компании, защита от брутфорса и двухфакторная аутентификация.' },
              { icon: 'bell' as const, title: 'Уведомления в реальном времени', desc: 'Push и звуковые оповещения о задачах, сообщениях и событиях — ничего не теряется.' },
              { icon: 'portal' as const, title: 'Прозрачность для заказчика', desc: 'Клиентский портал показывает статус проекта в режиме только для чтения — без лишних звонков.' },
              { icon: 'automation' as const, title: 'Автоматизация рутины', desc: 'Правила «триггер → действие»: смена статуса задачи, уведомления и другие сценарии без ручной работы.' },
              { icon: 'reports' as const, title: 'Аналитика и отчёты', desc: 'Готовые шаблоны и выгрузки по проекту или компании в CSV и PDF для руководства.' },
              { icon: 'chat' as const, title: 'Работает в поле', desc: 'PWA-приложение на телефоне прораба: офлайн-баннер, быстрый доступ, импорт чатов из Telegram.' },
            ].map((f) => {
              const Icon = icons[f.icon];
              return (
                <div key={f.title} className="rounded-2xl bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-500 text-white flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{f.title}</h3>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing (прайс) ────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">Тарифы</h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Прозрачные цены без скрытых платежей. Месяц бесплатно на любом тарифе.</p>
        </div>

        <div className="mt-12 grid lg:grid-cols-3 gap-6 items-start">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-3xl p-7 border transition-all ${
                p.featured
                  ? 'border-violet-500 bg-gray-900 dark:bg-gray-900 text-white shadow-2xl shadow-violet-500/20 lg:-mt-4 lg:mb-4'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold rounded-full bg-violet-500 text-white">
                  Популярный
                </span>
              )}
              <h3 className={`text-lg font-bold ${p.featured ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{p.name}</h3>
              <p className={`mt-1 text-sm ${p.featured ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>{p.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className={`text-4xl font-extrabold ${p.featured ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{p.price}</span>
                {p.period && <span className={`text-sm ${p.featured ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>{p.period}</span>}
              </div>

              <Link
                href={p.name === 'Корпоративный' ? `mailto:${SUPPORT_EMAIL}?subject=Корпоративный тариф 3.15 CRM` : '/auth/login'}
                className={`mt-6 flex items-center justify-center gap-2 w-full px-5 py-3 text-sm font-semibold rounded-xl transition-colors ${
                  p.featured
                    ? 'bg-violet-500 text-white hover:bg-violet-600'
                    : 'bg-gray-900 dark:bg-violet-500 text-white hover:bg-gray-800 dark:hover:bg-violet-600'
                }`}
              >
                {p.cta} <icons.arrow className="w-4 h-4" />
              </Link>

              <ul className="mt-7 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <icons.check className={`w-5 h-5 shrink-0 ${p.featured ? 'text-violet-400' : 'text-violet-500'}`} />
                    <span className={p.featured ? 'text-gray-200' : 'text-gray-600 dark:text-gray-300'}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Все цены указаны без НДС. Нужна помощь с выбором? Напишите нам:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-violet-600 dark:text-violet-400 font-medium hover:underline">{SUPPORT_EMAIL}</a>
        </p>
      </section>

      {/* ── Заявки на улучшения (CTA-band) ─────────────────────────────── */}
      <section id="requests" className="bg-gray-900 dark:bg-gray-900 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/20">
                <icons.bolt className="w-3.5 h-3.5" /> Мы развиваемся вместе с вами
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Заявки на улучшения</h2>
              <p className="mt-4 text-gray-300 leading-relaxed max-w-xl">
                Не хватает функции? Расскажите, что улучшить в 3.15 CRM. Мы читаем каждую заявку и приоритизируем доработки по вашим запросам.
              </p>
              <ul className="mt-6 space-y-2.5">
                {['Опишите идею или проблему', 'Мы оценим и возьмём в работу', 'Вы получите ответ о статусе'].map((s) => (
                  <li key={s} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <icons.check className="w-5 h-5 text-violet-400 shrink-0" /> {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-white dark:bg-gray-950 p-6 sm:p-8 border border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white">Оставить заявку</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Отправим в нашу команду продукта.</p>
              <form
                className="mt-5 space-y-4"
                action={`mailto:${SUPPORT_EMAIL}`}
                method="post"
                encType="text/plain"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ваш email</label>
                  <input type="email" name="email" required placeholder="you@company.ru" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Что улучшить?</label>
                  <textarea name="idea" required rows={4} placeholder="Опишите идею или проблему…" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none resize-none" />
                </div>
                <button type="submit" className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-violet-500 hover:bg-violet-600 rounded-xl transition-colors">
                  Отправить заявку <icons.arrow className="w-4 h-4" />
                </button>
              </form>
              <p className="mt-3 text-xs text-gray-400 text-center">
                Или напишите на <a href={`mailto:${SUPPORT_EMAIL}`} className="text-violet-600 dark:text-violet-400 hover:underline">{SUPPORT_EMAIL}</a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-24">
        <div className="rounded-3xl bg-gradient-to-br from-violet-500 to-violet-700 px-8 py-14 sm:px-14 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Готовы навести порядок на стройке?</h2>
          <p className="mt-4 text-violet-100 max-w-2xl mx-auto">Войдите в систему или попробуйте 3.15 CRM бесплатно в течение месяца.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/auth/login" className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-violet-700 bg-white hover:bg-violet-50 rounded-xl transition-colors">
              Войти в CRM <icons.arrow className="w-4 h-4" />
            </Link>
            <Link href="/portal/login" className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-violet-600/40 hover:bg-violet-600/60 ring-1 ring-white/30 rounded-xl transition-colors">
              Клиентский портал
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              {Logo}
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
                Система управления строительными проектами. От сметы до сдачи объекта — в одном окне.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Продукт</h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="#modules" className="text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400">Возможности</a></li>
                <li><a href="#pricing" className="text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400">Тарифы</a></li>
                <li><a href="#requests" className="text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400">Заявки на улучшения</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Вход</h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link href="/auth/login" className="text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400">Войти в CRM</Link></li>
                <li><Link href="/portal/login" className="text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400">Клиентский портал</Link></li>
                <li><Link href="/auth/register-company" className="text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400">Регистрация компании</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Контакты</h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href={`mailto:${SUPPORT_EMAIL}`} className="text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400">{SUPPORT_EMAIL}</a></li>
                <li><Link href="/privacy" className="text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400">Политика конфиденциальности</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-400">© {2026} 3.15 CRM. Все права защищены.</p>
            <p className="text-xs text-gray-400">Сделано для строителей 🏗️</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
