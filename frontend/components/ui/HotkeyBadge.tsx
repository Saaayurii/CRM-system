'use client';

/**
 * Small monospaced badge that shows a keyboard hint next to nav items.
 * Visibility (responsive show/hide) is controlled by the caller via className.
 */
export default function HotkeyBadge({
  label,
  className = '',
}: {
  label: string;
  className?: string;
}) {
  return (
    <kbd
      className={`items-center justify-center px-1.5 py-0.5 text-[10px] font-mono font-medium leading-none rounded border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400 select-none ${className}`}
      title={`Горячая клавиша: ${label}`}
    >
      {label}
    </kbd>
  );
}
