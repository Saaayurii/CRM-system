'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Transition from '@/components/ui/Transition';
import { useAuthStore } from '@/stores/authStore';
import KeyboardShortcutsModal from '@/components/ui/KeyboardShortcutsModal';

export default function ProfileDropdown({ navItem }: { navItem?: boolean }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [fixedStyle, setFixedStyle] = useState<React.CSSProperties>({});
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [switching, setSwitching] = useState<number | null>(null);
  const { user, logout, availableAccounts, fetchAvailableAccounts, switchCompany } = useAuthStore();
  const trigger = useRef<HTMLButtonElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAvailableAccounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!dropdown.current) return;
      if (!dropdownOpen || dropdown.current.contains(target as Node) || trigger.current?.contains(target as Node)) return;
      setDropdownOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  useEffect(() => {
    const keyHandler = ({ key }: KeyboardEvent) => {
      if (!dropdownOpen || key !== 'Escape') return;
      setDropdownOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  const otherAccounts = availableAccounts.filter((a) => a.id !== user?.accountId);

  const handleSwitch = async (accountId: number) => {
    setSwitching(accountId);
    try {
      await switchCompany(accountId);
    } catch {
      setSwitching(null);
    }
  };

  // Global Alt+Q -> logout
  const handleLogout = useCallback(() => {
    setDropdownOpen(false);
    logout();
  }, [logout]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        handleLogout();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleLogout]);

  const handleToggle = () => {
    if (!dropdownOpen && navItem && trigger.current) {
      const rect = trigger.current.getBoundingClientRect();
      const bottomFromViewport = window.innerHeight - rect.top + 4;
      setFixedStyle({
        position: 'fixed',
        bottom: bottomFromViewport,
        left: rect.left,
        minWidth: Math.max(rect.width, 208),
        maxHeight: rect.top - 16,
        zIndex: 500,
      });
    }
    setDropdownOpen((prev) => !prev);
  };

  const dropdownBody = (
    <div ref={dropdown} onFocus={() => setDropdownOpen(true)} onBlur={() => setDropdownOpen(false)}>
      <div className="pt-0.5 pb-2 px-3 mb-1 border-b border-gray-200 dark:border-gray-700/60">
        <div className="font-medium text-gray-800 dark:text-gray-100">{user?.email || 'User'}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 italic">{user?.role?.name || 'Role'}</div>
      </div>

      {otherAccounts.length > 0 && (
        <div className="pb-2 mb-1 border-b border-gray-200 dark:border-gray-700/60">
          <div className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Сменить компанию
          </div>
          {otherAccounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => handleSwitch(acc.id)}
              disabled={switching !== null}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-50 transition-colors text-left"
            >
              <div className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                {acc.logoUrl ? (
                  <img src={acc.logoUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-300">
                    {acc.name[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{acc.name}</span>
              {switching === acc.id && (
                <svg className="w-3.5 h-3.5 text-violet-500 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      <ul>
        {user?.role?.code !== 'super_admin' && (
          <li>
            <Link
              href="/dashboard/settings"
              className="font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-violet-500 dark:hover:text-violet-400 flex items-center py-1 px-3"
              onClick={() => setDropdownOpen(false)}
            >
              Настройки
            </Link>
          </li>
        )}
        <li>
          <button
            className="font-medium text-sm text-gray-700 dark:text-gray-300 hover:text-violet-500 dark:hover:text-violet-400 flex items-center gap-2 py-1 px-3 w-full text-left"
            onClick={() => { setDropdownOpen(false); setShortcutsOpen(true); }}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <rect x="2" y="6" width="20" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 10.5h.01M10 10.5h.01M14 10.5h.01M18 10.5h.01M8 14.5h8" />
            </svg>
            Горячие клавиши
          </button>
        </li>
        <li>
          <button
            className="font-medium text-sm text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 flex items-center py-1 px-3 w-full text-left"
            onClick={handleLogout}
          >
            Выйти
          </button>
        </li>
      </ul>
    </div>
  );

  const transitionProps = {
    show: dropdownOpen,
    enter: 'transition ease-out duration-200 transform',
    enterStart: 'opacity-0 -translate-y-2',
    enterEnd: 'opacity-100 translate-y-0',
    leave: 'transition ease-out duration-200',
    leaveStart: 'opacity-100',
    leaveEnd: 'opacity-0',
  };

  return (
    <div className={navItem ? 'relative w-full' : 'relative inline-flex'}>
      <button
        ref={trigger}
        className={navItem
          ? 'flex items-center gap-3 py-2 px-3 rounded-lg w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition duration-150 truncate cursor-pointer'
          : 'inline-flex justify-center items-center group'}
        aria-haspopup="true"
        onClick={handleToggle}
        aria-expanded={dropdownOpen}
      >
        <div className={navItem ? 'w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-medium overflow-hidden shrink-0' : 'w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-medium overflow-hidden'}>
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            user?.email?.charAt(0).toUpperCase() || 'U'
          )}
        </div>
        {navItem ? (
          <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200 truncate">
            {user?.role?.code === 'super_admin' ? 'Система' : (user?.name || user?.email || 'Профиль')}
          </span>
        ) : (
          <svg className="w-3 h-3 shrink-0 ml-1 fill-current text-gray-400 dark:text-gray-500" viewBox="0 0 12 12">
            <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
          </svg>
        )}
      </button>

      {navItem ? (
        <div style={fixedStyle}>
          <Transition
            className="origin-bottom-left min-w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden"
            {...transitionProps}
          >
            {dropdownBody}
          </Transition>
        </div>
      ) : (
        <Transition
          className="origin-top-right z-10 absolute top-full min-w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1 right-0"
          {...transitionProps}
        >
          {dropdownBody}
        </Transition>
      )}
      <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
