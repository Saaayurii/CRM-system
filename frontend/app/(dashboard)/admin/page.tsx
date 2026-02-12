'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import ServiceGrid from '@/components/admin/ServiceGrid';
import RoleAccessMatrix from '@/components/admin/RoleAccessMatrix';

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading && user?.role?.code !== 'super_admin') {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || user?.role?.code !== 'super_admin') {
    return null;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
          Администрирование
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Управление микросервисами и ролями доступа
        </p>
      </div>

      {/* Microservices */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Микросервисы
        </h2>
        <ServiceGrid />
      </section>

      {/* Role Access Matrix */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Матрица доступа ролей
        </h2>
        <RoleAccessMatrix />
      </section>
    </div>
  );
}
