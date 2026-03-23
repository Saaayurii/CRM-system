import Link from 'next/link';

const CrmLogo = () => (
  <svg className="fill-violet-500 shrink-0" xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 32 32">
    <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
  </svg>
);

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-10 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>

          {/* Logo / company name */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <CrmLogo />
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">CRM Система</span>
          </div>

          {/* Code + title */}
          <p className="text-7xl font-extrabold text-violet-500 mt-4 mb-1 tracking-tight">404</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3">
            Страница не найдена
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
            Запрашиваемая страница не существует или была перемещена.<br />
            Проверьте адрес или вернитесь на главную.
          </p>

          <div className="border-t border-gray-100 dark:border-gray-700 mb-6" />

          {/* Status */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <span className="inline-flex h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500" />
            Ресурс не найден на сервере
          </div>

          {/* Action */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            Вернуться на Dashboard
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          © {new Date().getFullYear()} CRM Система. Страница не найдена.
        </p>
      </div>
    </div>
  );
}
