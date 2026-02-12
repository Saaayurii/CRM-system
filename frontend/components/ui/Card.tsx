import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 shadow-xs rounded-xl', className)}>
      {children}
    </div>
  );
}
