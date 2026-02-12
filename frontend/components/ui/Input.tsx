'use client';

import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn('form-input w-full', error && 'border-red-500!', className)}
        {...props}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
