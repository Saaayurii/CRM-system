import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-500/20 text-green-700 dark:text-green-400',
  danger: 'bg-red-500/20 text-red-700 dark:text-red-400',
  warning: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  default: 'bg-gray-500/20 text-gray-700 dark:text-gray-400',
};

export default function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
