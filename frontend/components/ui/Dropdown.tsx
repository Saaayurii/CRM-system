'use client';

import { useState, useRef, useEffect } from 'react';
import Transition from './Transition';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export default function Dropdown({ trigger, children, align = 'left', className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!dropdownRef.current || !triggerRef.current) return;
      if (!open || dropdownRef.current.contains(target as Node) || triggerRef.current.contains(target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  useEffect(() => {
    const keyHandler = ({ key }: KeyboardEvent) => {
      if (!open || key !== 'Escape') return;
      setOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  return (
    <div className="relative inline-flex">
      <div ref={triggerRef} onClick={() => setOpen(!open)}>
        {trigger}
      </div>
      <Transition
        className={`origin-top-${align} z-10 absolute top-full min-w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1 ${align === 'right' ? 'right-0' : 'left-0'} ${className || ''}`}
        show={open}
        enter="transition ease-out duration-200 transform"
        enterStart="opacity-0 -translate-y-2"
        enterEnd="opacity-100 translate-y-0"
        leave="transition ease-out duration-200"
        leaveStart="opacity-100"
        leaveEnd="opacity-0"
      >
        <div ref={dropdownRef}>{children}</div>
      </Transition>
    </div>
  );
}
