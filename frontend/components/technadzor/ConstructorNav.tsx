'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useT } from '@/lib/i18n';

const STEP_ITEMS = [
  { n: 1, label: '1. Создание пункта' },
  { n: 2, label: '2. Типовые дефекты' },
  { n: 3, label: '3. Шаблоны текстов' },
  { n: 4, label: '4. Настройки отчёта' },
  { n: 5, label: '5. Публикация' },
];

const LIBRARY = [
  { href: '/dashboard/technadzor/control-points', label: 'Пункты контроля' },
  { href: '/dashboard/technadzor/templates', label: 'Чек-листы' },
  { href: '/dashboard/technadzor/norms', label: 'Нормативы (ГОСТ, СП)' },
];

const REFS = [
  { href: '/dashboard/technadzor/contractors', label: 'Подрядчики' },
  { href: '/dashboard/technadzor/objects', label: 'Объекты' },
];

export default function ConstructorNav() {
  const t = useT();
  const pathname = usePathname();
  const params = useSearchParams();
  const inBuilder = pathname.endsWith('/control-points/new');
  const currentStep = Number(params.get('step')) || 1;
  const editId = params.get('id');
  const builderHref = (n: number) => `/dashboard/technadzor/control-points/new?${editId ? `id=${editId}&` : ''}step=${n}`;

  const linkCls = (active: boolean) =>
    `block px-3 py-2 rounded-lg text-sm transition ${
      active
        ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium'
        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/40'
    }`;

  return (
    <aside className="hidden xl:block w-56 shrink-0">
      <div className="sticky top-4 space-y-6">
        <div className="flex items-center gap-2 px-2">
          <span className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center text-sm font-bold">✓</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">{t('Конструктор чек-листов')}</span>
        </div>

        {inBuilder && (
          <div>
            <div className="px-3 text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1">{t('Этапы создания')}</div>
            <nav className="space-y-0.5">
              {STEP_ITEMS.map((s) => (
                <Link key={s.n} href={builderHref(s.n)} className={linkCls(currentStep === s.n)}>{t(s.label)}</Link>
              ))}
            </nav>
          </div>
        )}

        <div>
          <div className="px-3 text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1">{t('Библиотека')}</div>
          <nav className="space-y-0.5">
            {LIBRARY.map((l) => (
              <Link key={l.href} href={l.href} className={linkCls(!inBuilder && pathname === l.href)}>{t(l.label)}</Link>
            ))}
          </nav>
        </div>

        <div>
          <div className="px-3 text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500 mb-1">{t('Справочники')}</div>
          <nav className="space-y-0.5">
            {REFS.map((l) => (
              <Link key={l.href} href={l.href} className={linkCls(pathname === l.href)}>{t(l.label)}</Link>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}
