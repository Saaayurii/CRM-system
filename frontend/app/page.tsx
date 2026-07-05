'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Токен теперь в httpOnly-cookie (JS не читает). Ориентируемся на читаемый
    // маркер сессии `crm-session`, который ставится при входе.
    const hasSession = /(?:^|;\s*)crm-session=true/.test(document.cookie);
    router.replace(hasSession ? '/dashboard' : '/landing');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
    </div>
  );
}
