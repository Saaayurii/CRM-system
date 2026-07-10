'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Нормативы (ГОСТ/СП/СНиП) уже реализованы в Строительной ВИКИ (wiki-service
// construction-norms) — переиспользуем существующий раздел, чтобы не дублировать.
export default function Page() {
  const router = useRouter();
  // section=norms открывает нужную вкладку сразу; from=technadzor включает
  // на странице Вики хлебную крошку назад в Технадзор (см. wiki/page.tsx).
  useEffect(() => { router.replace('/dashboard/wiki?section=norms&from=technadzor'); }, [router]);
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto text-sm text-gray-400">
      Переход к нормативной базе…
    </div>
  );
}
