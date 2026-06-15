'use client';

/**
 * Тултип-плашка у поля ввода почты/логина: краткое разъяснение про вход через
 * иностранные сервисы (Gmail, Apple ID и т.п.) в связи с законопроектом
 * №1069392-8 (поправки в КоАП об ответственности за нарушение правил авторизации).
 * Источник: https://sozd.duma.gov.ru/bill/1069392-8
 *
 * Показывается при наведении/фокусе на поле (`open`) либо автоматически, когда в
 * поле введён адрес иностранного почтового провайдера.
 */

const FOREIGN_EMAIL_RE =
  /@(gmail|googlemail|google|apple|icloud|me|mac|hotmail|outlook|live|msn|yahoo|ymail|rocketmail|proton|protonmail|gmx|aol)\./i;

export function isForeignEmail(value: string): boolean {
  return FOREIGN_EMAIL_RE.test(value.trim());
}

export default function ForeignEmailNotice({
  value,
  open,
}: {
  value: string;
  open: boolean;
}) {
  const visible = open || isForeignEmail(value);
  if (!visible) return null;

  return (
    <div className="absolute left-0 right-0 top-full mt-2 z-30">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl px-4 py-3 text-left animate-fadeInUpSoft">
        {/* стрелочка к полю */}
        <div className="absolute -top-1.5 left-6 w-3 h-3 rotate-45 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700" />

        <div className="flex items-start gap-2.5">
          <svg
            className="w-5 h-5 shrink-0 mt-0.5 text-violet-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <div className="text-xs leading-relaxed text-gray-600 dark:text-gray-300 space-y-1.5">
            <p className="font-semibold text-gray-800 dark:text-gray-100">
              Вход через иностранную почту (Gmail, Apple ID)
            </p>
            <p>
              9 июня 2026 года Госдума приняла в третьем чтении законопроект{' '}
              <a
                href="https://sozd.duma.gov.ru/bill/1069392-8"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-500 hover:text-violet-600 underline underline-offset-2"
              >
                №&nbsp;1069392-8
              </a>{' '}
              — поправки в КоАП об ответственности за нарушение правил авторизации
              пользователей на сайтах.
            </p>
            <p>
              Ответственность по нему возлагается на{' '}
              <span className="font-medium text-gray-800 dark:text-gray-200">владельцев сайтов</span>, а не на
              пользователей. Вход в систему через Gmail или Apple ID для вас безопасен и штрафами не грозит.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
