'use client';

import { useState, useEffect, useRef } from 'react';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useAuthStore } from '@/stores/authStore';
import ThemeToggle from './ThemeToggle';
import ProfileDropdown from './ProfileDropdown';
import NotificationDropdown from './NotificationDropdown';
import ChatButton from './ChatButton';
import api from '@/lib/api';

interface AccountOption {
  id: number;
  name: string;
  logoUrl?: string;
  status: number;
}

function CompanyName() {
  const user = useAuthStore((s) => s.user);
  const selectedAccountId = useAuthStore((s) => s.selectedAccountId);
  const selectedAccountName = useAuthStore((s) => s.selectedAccountName);
  const selectedAccountLogo = useAuthStore((s) => s.selectedAccountLogo);
  const switchAccount = useAuthStore((s) => s.switchAccount);
  const resetAccountSwitch = useAuthStore((s) => s.resetAccountSwitch);

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isGlobal = user?.isGlobalAdmin;
  const activeId = selectedAccountId ?? user?.accountId;
  const activeAccount = accounts.find((a) => a.id === activeId);
  // Use persisted name immediately (survives page reload), fall back to loaded list
  const resolvedName = selectedAccountId
    ? (activeAccount?.name ?? selectedAccountName ?? 'Компания')
    : 'Все компании';
  const resolvedLogo = activeAccount?.logoUrl ?? selectedAccountLogo ?? null;
  const displayName = isGlobal ? resolvedName : (user?.accountName || null);

  useEffect(() => {
    if (!isGlobal || !open) return;
    setLoading(true);
    api.get('/accounts').then(({ data }) => {
      const list: any[] = data?.data || data?.accounts || data || [];
      setAccounts(list.map((a) => ({ id: a.id, name: a.name, logoUrl: a.logoUrl || a.logo_url, status: a.status ?? 1 })));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isGlobal, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!displayName && !isGlobal) return null;

  if (!isGlobal) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700/50">
        {user?.accountLogoUrl && (
          <img src={user.accountLogoUrl} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[160px]">{displayName}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        {resolvedLogo && (
          <img src={resolvedLogo} alt="" className="w-5 h-5 rounded object-cover shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[160px]">
          {resolvedName}
        </span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="py-1">
            <button
              onClick={() => { resetAccountSwitch(); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                !selectedAccountId
                  ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </div>
              Все компании
            </button>

            {loading && <p className="px-3 py-2 text-xs text-gray-400">Загрузка...</p>}

            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => { switchAccount(acc.id, acc.name, acc.logoUrl); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                  selectedAccountId === acc.id
                    ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-600 flex items-center justify-center shrink-0 overflow-hidden">
                  {acc.logoUrl
                    ? <img src={acc.logoUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs font-bold text-gray-500 dark:text-gray-300">{acc.name[0]?.toUpperCase()}</span>}
                </div>
                <span className="truncate">{acc.name}</span>
                {acc.status !== 1 && <span className="ml-auto text-xs text-orange-400">неакт.</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { sidebarOpen, setSidebarOpen } = useSidebarStore();

  return (
    <header className="sticky top-0 before:absolute before:inset-0 before:backdrop-blur-md max-lg:before:bg-white/90 dark:max-lg:before:bg-gray-800/90 before:-z-10 z-30 max-lg:shadow-xs lg:before:bg-gray-100/90 dark:lg:before:bg-gray-900/90">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:border-b border-gray-200 dark:border-gray-700/60">
          {/* Left side */}
          <div className="flex items-center gap-3">
            <button
              className="text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 lg:hidden"
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(!sidebarOpen);
              }}
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="16" height="2" />
                <rect x="4" y="11" width="16" height="2" />
                <rect x="4" y="17" width="16" height="2" />
              </svg>
            </button>
            <CompanyName />
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-3">
            <ChatButton />
            <NotificationDropdown />
            <ThemeToggle />
            <hr className="w-px h-6 bg-gray-200 dark:bg-gray-700/60 border-none" />
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </header>
  );
}
