'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-500 mb-4">500</h1>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Что-то пошло не так</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {error.message || 'Произошла непредвиденная ошибка.'}
        </p>
        <button
          onClick={reset}
          className="btn bg-violet-500 hover:bg-violet-600 text-white"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}
