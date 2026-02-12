import { CardSkeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="mb-8">
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-48 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
