import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-violet-500 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Страница не найдена</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Запрашиваемая страница не существует или была перемещена.</p>
        <Link
          href="/dashboard"
          className="btn bg-violet-500 hover:bg-violet-600 text-white"
        >
          Вернуться на Dashboard
        </Link>
      </div>
    </div>
  );
}
