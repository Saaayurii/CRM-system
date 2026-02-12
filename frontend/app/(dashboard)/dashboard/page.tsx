'use client';

import { useAuthStore } from '@/stores/authStore';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
            Dashboard
          </h1>
          {user && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Добро пожаловать, {user.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Проекты</h2>
          <p className="text-3xl font-bold text-violet-500">—</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Скоро будет доступно</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Задачи</h2>
          <p className="text-3xl font-bold text-green-500">—</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Скоро будет доступно</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Сотрудники</h2>
          <p className="text-3xl font-bold text-sky-500">—</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Скоро будет доступно</p>
        </div>
      </div>
    </div>
  );
}
