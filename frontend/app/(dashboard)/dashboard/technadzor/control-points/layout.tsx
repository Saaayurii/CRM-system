import { Suspense } from 'react';
import ConstructorNav from '@/components/technadzor/ConstructorNav';

export default function ControlPointsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-6 -mt-2">
      <Suspense fallback={null}>
        <ConstructorNav />
      </Suspense>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
