'use client';
import TechnadzorInspectionsList from '@/components/technadzor/TechnadzorInspectionsList';

export default function Page() {
  return <TechnadzorInspectionsList variant="assigned" breadcrumbLabel="Назначенные мне" />;
}
