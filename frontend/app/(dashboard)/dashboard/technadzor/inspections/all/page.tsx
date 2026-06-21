'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// «Все инспекции» теперь основная страница /inspections — редиректим для старых ссылок.
export default function Page() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/technadzor/inspections'); }, [router]);
  return null;
}
