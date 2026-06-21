'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/lib/i18n';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useAuthStore } from '@/stores/authStore';
import { useTaskNotifStore } from '@/stores/taskNotifStore';
import { useChatStore } from '@/stores/chatStore';
import { useNavHotkeys, type NavHotkey } from '@/hooks/useNavHotkeys';
import { haptic } from '@/lib/haptics';
import SidebarLinkGroup from './SidebarLinkGroup';
import ClientSidebar from './ClientSidebar';
import NotificationDropdown from './NotificationDropdown';
import ThemeToggle from './ThemeToggle';
import ProfileDropdown from './ProfileDropdown';
import api from '@/lib/api';

function NavLink({ href, className, children }: { href: string; className?: string; hotkey?: NavHotkey; children: React.ReactNode }) {
  const { setSidebarOpen } = useSidebarStore();
  return (
    <Link href={href} className={className} onClick={() => { setSidebarOpen(false); }}>
      {children}
    </Link>
  );
}

function AnimatedSubmenu({ open, children }: { open: boolean; children: React.ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={contentRef}
      className="lg:hidden lg:sidebar-expanded:block overflow-hidden transition-all duration-300 ease-in-out"
      style={{ maxHeight: open ? '24rem' : '0px', opacity: open ? 1 : 0 }}
    >
      {children}
    </div>
  );
}

/* ─── Nav item icon wrappers ─── */

function IconDashboard() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
    </svg>
  );
}
function IconProjects() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  );
}
function IconTasks() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
function IconEmployees() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}
function IconClients() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.006 0V6.375c0-.621-.504-1.125-1.125-1.125H9.62c-.622 0-1.125.504-1.125 1.125v8.25m5.625 0H9.62" />
    </svg>
  );
}
function IconSite() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
    </svg>
  );
}
function IconAttendance() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}
function IconTimeOff() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}
function IconDocuments() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}
function IconMedia() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  );
}
function IconTechnadzor() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.249-8.25-3.285Z" />
    </svg>
  );
}
function IconEquipment() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.654-4.654m5.598-2.623 3.03-2.496a4.5 4.5 0 0 0-6.032-6.032l-3.03 2.496" />
    </svg>
  );
}
function IconInspections() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  );
}
function IconOrders() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
    </svg>
  );
}
function IconSuppliers() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}
function IconMaterials() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}
function IconRequests() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859M12 3v8.25m0 0-3-3m3 3 3-3" />
    </svg>
  );
}
function IconPayments() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  );
}
function IconBudgets() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}
function IconSalaries() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
function IconFinance() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5h18M3 7.5V18a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 18V7.5M3 7.5l1.5-3h15L21 7.5M9 12h6m-6 3h3" />
    </svg>
  );
}
function IconDefects() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}
function IconTeams() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}
function IconWarehouse() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75 12 4l9 5.75V20a1 1 0 0 1-1 1h-4v-7H8v7H4a1 1 0 0 1-1-1V9.75Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 14h8M8 17h8" />
    </svg>
  );
}
function IconHRDocs() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 9h18M5.25 5.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25Z" />
    </svg>
  );
}

function IconNotes() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25h7.5L20.25 13.5V6A2.25 2.25 0 0 0 18 3.75Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 20.25V15a1.5 1.5 0 0 1 1.5-1.5h5.25M7.5 8.25h7.5M7.5 11.25h4.5" />
    </svg>
  );
}

/* ─── Company switcher (was in Header) ─── */
interface AccountOption { id: number; name: string; logoUrl?: string; status: number; }

function CompanySwitcher() {
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

  const isGlobal = user?.isGlobalAdmin || user?.roleId === 1;
  const activeId = selectedAccountId ?? user?.accountId;
  const activeAccount = accounts.find((a) => a.id === activeId);
  const t = useT();
  const resolvedName = selectedAccountId
    ? (activeAccount?.name ?? selectedAccountName ?? 'Компания')
    : t('Все компании');
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
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700/50 w-full">
        {user?.accountLogoUrl && (
          <img src={user.accountLogoUrl} alt="" className="w-6 h-6 rounded object-cover shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate lg:hidden lg:sidebar-expanded:block">{displayName}</span>
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors w-full"
      >
        {resolvedLogo
          ? <img src={resolvedLogo} alt="" className="w-6 h-6 rounded object-cover shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          : (
            <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
          )
        }
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex-1 text-left lg:hidden lg:sidebar-expanded:block">
          {resolvedName}
        </span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 lg:hidden lg:sidebar-expanded:block ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              {t('Все компании')}
            </button>
            {loading && <p className="px-3 py-2 text-xs text-gray-400">{t('Загрузка...')}</p>}
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
                {acc.status !== 1 && <span className="ml-auto text-xs text-orange-400">{t("неакт.")}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── link class helpers ─── */
function linkCls(active: boolean) {
  return `flex items-center gap-3 py-2 px-3 rounded-lg transition duration-150 truncate ${
    active
      ? 'text-violet-500 bg-violet-50 dark:bg-violet-500/10'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
  }`;
}


export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen, sidebarExpanded, setSidebarExpanded, initialize } = useSidebarStore();
  const user = useAuthStore((s) => s.user);
  const t = useT();
  const isSuperAdmin = user?.role?.code === 'super_admin';
  const roleCode = user?.role?.code;
  const isHR = roleCode === 'hr_manager';
  const isPM = roleCode === 'project_manager';
  const isForeman = roleCode === 'foreman';
  const isWorker = roleCode === 'worker';
  const isSupplier = roleCode === 'supplier_manager';
  const isWarehouse = roleCode === 'warehouse_keeper';
  const isAccountant = roleCode === 'accountant';
  const isInspector = roleCode === 'inspector';
  const isAdmin = roleCode === 'admin';
  const isClient = user?.roleId === 15;
  const showTeams = isSuperAdmin || isAdmin || isPM || isHR;
  const showTechnadzor = isSuperAdmin || isAdmin || isPM || isForeman || isInspector;
  const showChat = true;
  const calendarHref =
    isPM        ? '/dashboard/pm/calendar' :
    isInspector ? '/dashboard/inspector/calendar' :
    isHR        ? '/dashboard/hr/calendar' :
    isForeman   ? '/dashboard/foreman/calendar' :
    isWorker    ? '/dashboard/worker/calendar' :
    isAccountant? '/dashboard/accountant/calendar' :
    isSupplier  ? '/dashboard/supplier/calendar' :
    isWarehouse ? '/dashboard/warehouse/calendar' :
    '/dashboard/calendar';
  const taskUnread = useTaskNotifStore((s) => s.unreadCount);
  const chatUnread = useChatStore((s) => Object.values(s.unreadCounts).reduce((a, b) => a + b, 0));
  const fetchChatUnreadSummary = useChatStore((s) => s.fetchUnreadSummary);

  // Keep chat badge live across the app — refresh on mount and every 60s
  useEffect(() => {
    if (!user) return;
    fetchChatUnreadSummary();
    const id = setInterval(fetchChatUnreadSummary, 60_000);
    return () => clearInterval(id);
  }, [user, fetchChatUnreadSummary]);
  const settingsHref = isSuperAdmin ? '/admin/settings' : '/dashboard/settings';

  // Hotkeys: stable Alt+digit/letter combos for main routes; full list also drives badges.
  const hotkeys = useMemo<NavHotkey[]>(() => {
    const list: NavHotkey[] = [
      { key: '1', href: '/dashboard' },
      { key: '2', href: '/dashboard/projects' },
      { key: '3', href: '/dashboard/tasks' },
      { key: '4', href: '/dashboard/community' },
      { key: '5', href: '/dashboard/documents' },
      { key: 'c', href: calendarHref },
      { key: 'n', href: '/dashboard/notes' },
      { key: 'm', href: '/dashboard/media' },
      { key: 'l', href: '/dashboard/learning' },
      { key: 'w', href: '/dashboard/wiki' },
      { key: 'i', href: '/dashboard/safety-briefings' },
      { key: 'h', href: '/dashboard/hse' },
    ];
    if (showTeams) list.push({ key: '6', href: '/dashboard/teams' });
    if (isSuperAdmin || isAdmin || isPM) list.push({ key: '7', href: '/dashboard/clients' });
    if (showChat) list.push({ key: '8', href: '/dashboard/chat' });
    if (isSuperAdmin || isAdmin || isAccountant || isPM) list.push({ key: 'f', href: '/dashboard/finance' });
    if (isSuperAdmin || isAdmin || isPM || isForeman || isWarehouse) list.push({ key: 's', href: '/dashboard/warehouse' });
    if (isAdmin || isSuperAdmin) list.push({ key: '9', href: '/dashboard/company' });
    list.push({ key: '0', href: settingsHref });
    if (isSuperAdmin) list.push({ key: 'a', href: '/admin' });
    return list;
  }, [showTeams, isAdmin, isHR, isPM, isSuperAdmin, showChat, settingsHref, calendarHref, isAccountant, isForeman, isWarehouse]);

  useNavHotkeys(hotkeys);
  const hkByHref = useMemo(() => Object.fromEntries(hotkeys.map((h) => [h.href, h])), [hotkeys]);

  const trigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hover-intent: разворачиваем с небольшой задержкой (чтобы случайный проход
  // курсора не дёргал меню) и сворачиваем чуть позже — переход выглядит плавнее.
  const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
  const handleSidebarEnter = () => {
    if (!isDesktop()) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setSidebarExpanded(true), 90);
  };
  const handleSidebarLeave = () => {
    if (!isDesktop()) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setSidebarExpanded(false), 180);
  };
  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  useEffect(() => { initialize(); }, [initialize]);

  // Close mobile sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (!sidebarOpen || sidebar.current.contains(target as Node) || trigger.current.contains(target as Node)) return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  useEffect(() => {
    const keyHandler = ({ key }: KeyboardEvent) => {
      if (!sidebarOpen || key !== 'Escape') return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  // Touch swipe: open the sidebar by swiping right from the left edge,
  // close it by swiping left. Mobile only (sidebar is static on lg+).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(min-width: 1024px)').matches) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      // Track only from the very left edge (to open) or while already open (to close)
      tracking = sidebarOpen || startX <= 28;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < 60 || Math.abs(dy) > 50) return; // mostly-horizontal swipe
      if (!sidebarOpen && dx > 0) {
        setSidebarOpen(true);
        haptic(15);
      } else if (sidebarOpen && dx < 0) {
        setSidebarOpen(false);
        haptic(15);
      }
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [sidebarOpen, setSidebarOpen]);

  // Client portal gets a dedicated, slimmed-down sidebar.
  // Must come AFTER all hooks above so the hook count stays stable across
  // role transitions (otherwise React error #300 on admin→client switch).
  if (isClient) {
    return <ClientSidebar />;
  }

  return (
    <div className="min-w-fit">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-gray-900/30 z-40 lg:hidden lg:z-auto transition-opacity duration-200 ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        id="sidebar"
        ref={sidebar}
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        className={`flex lg:flex! flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-[100dvh] w-64 lg:w-20 lg:sidebar-expanded:!w-64 shrink-0 bg-white dark:bg-gray-800 transition-[width,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] ${sidebarOpen ? 'translate-x-0' : '-translate-x-64'} rounded-r-2xl shadow-xs`}
      >
        {/* Top: company switcher + utility buttons */}
        <div className="shrink-0 px-4 pt-4 pb-3">
          {/* Mobile close + company */}
          <div className="flex items-center gap-2 mb-3">
            <button
              ref={trigger}
              className="lg:hidden text-gray-500 hover:text-gray-400 shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-controls="sidebar"
              aria-expanded={sidebarOpen}
            >
              <span className="sr-only">Close sidebar</span>
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" /></svg>
            </button>
            <CompanySwitcher />
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-gray-700 mx-4 mb-2" />

        {/* Scrollable nav */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-4">
        <div className="space-y-8">
          <div>
            <h3 className="text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold pl-3 pt-2">
              <span className="hidden lg:block lg:sidebar-expanded:hidden text-center w-6" aria-hidden="true">&bull;&bull;&bull;</span>
              <span className="lg:hidden lg:sidebar-expanded:block">{t('Меню')}</span>
            </h3>
            <ul className="mt-3">

              {/* Overview */}
              <li className="mb-1 last:mb-0">
                <NavLink href="/dashboard" hotkey={hkByHref['/dashboard']} className={linkCls(pathname === '/dashboard')}>
                  <IconDashboard />
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Обзор")}</span>
                </NavLink>
              </li>

              {/* Projects */}
              <li className="mb-1 last:mb-0">
                <NavLink href="/dashboard/projects" hotkey={hkByHref['/dashboard/projects']} className={linkCls(pathname.startsWith('/dashboard/projects'))}>
                  <IconProjects />
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Проекты")}</span>
                </NavLink>
              </li>

              {/* Tasks */}
              <li className="mb-1 last:mb-0">
                <NavLink href="/dashboard/tasks" hotkey={hkByHref['/dashboard/tasks']} className={linkCls(pathname === '/dashboard/tasks')}>
                  <div className="relative shrink-0">
                    <IconTasks />
                    {taskUnread > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full">
                        {taskUnread > 9 ? '9+' : taskUnread}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Задачи")}</span>
                </NavLink>
              </li>

              {/* Сообщество */}
              <li className="mb-1 last:mb-0">
                <NavLink
                  href="/dashboard/community"
                  className={linkCls(
                    pathname.startsWith('/dashboard/community') ||
                    pathname === '/dashboard/employees' ||
                    pathname.startsWith('/dashboard/clients') ||
                    pathname === '/dashboard/teams'
                  )}
                >
                  <IconEmployees />
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Сообщество")}</span>
                </NavLink>
              </li>

              {/* Calendar */}
              <li className="mb-1 last:mb-0">
                <NavLink href={calendarHref} className={linkCls(pathname.includes('/calendar'))}>
                  <IconCalendar />
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Календарь")}</span>
                </NavLink>
              </li>

              {/* Notes — Заметки */}
              <li className="mb-1 last:mb-0">
                <NavLink href="/dashboard/notes" className={linkCls(pathname.startsWith('/dashboard/notes'))}>
                  <IconNotes />
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Заметки")}</span>
                </NavLink>
              </li>

              {/* PM extras */}
              {isPM && (
                <li className="mb-1 last:mb-0">
                  <NavLink href="/dashboard/pm/construction-sites" className={linkCls(pathname === '/dashboard/pm/construction-sites')}>
                    <IconSite />
                    <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Стройплощадки")}</span>
                  </NavLink>
                </li>
              )}

              {/* HR extras */}
              {isHR && (
                <>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/hr/attendance" className={linkCls(pathname === '/dashboard/hr/attendance')}>
                      <IconAttendance />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Посещаемость")}</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/hr/time-off" className={linkCls(pathname === '/dashboard/hr/time-off')}>
                      <IconTimeOff />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Отпуска")}</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/hr/documents" className={linkCls(pathname === '/dashboard/hr/documents')}>
                      <IconHRDocs />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Документы сотрудников")}</span>
                    </NavLink>
                  </li>
                </>
              )}

              {/* Foreman extras */}
              {isForeman && (
                <>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/foreman/construction-sites" className={linkCls(pathname === '/dashboard/foreman/construction-sites')}>
                      <IconSite />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Стройплощадки")}</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/foreman/equipment" className={linkCls(pathname === '/dashboard/foreman/equipment')}>
                      <IconEquipment />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Оборудование")}</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/foreman/inspections" className={linkCls(pathname === '/dashboard/foreman/inspections')}>
                      <IconInspections />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Проверки")}</span>
                    </NavLink>
                  </li>
                </>
              )}

              {/* Worker extras */}
              {isWorker && (
                <>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/worker/attendance" className={linkCls(pathname === '/dashboard/worker/attendance')}>
                      <IconAttendance />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Посещаемость")}</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/worker/time-off" className={linkCls(pathname === '/dashboard/worker/time-off')}>
                      <IconTimeOff />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Отпуска")}</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/worker/construction-sites" className={linkCls(pathname === '/dashboard/worker/construction-sites')}>
                      <IconSite />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Стройплощадки")}</span>
                    </NavLink>
                  </li>
                </>
              )}

              {/* Supplier extras */}
              {isSupplier && (
                <>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/supplier/suppliers" className={linkCls(pathname === '/dashboard/supplier/suppliers')}>
                      <IconSuppliers />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Поставщики")}</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/supplier/orders" className={linkCls(pathname === '/dashboard/supplier/orders')}>
                      <IconOrders />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Заказы")}</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/supplier/materials" className={linkCls(pathname === '/dashboard/supplier/materials')}>
                      <IconMaterials />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Материалы")}</span>
                    </NavLink>
                  </li>
                </>
              )}

              {/* Warehouse extras */}
              {isWarehouse && (
                <>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/warehouse/materials" className={linkCls(pathname === '/dashboard/warehouse/materials')}>
                      <IconMaterials />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Материалы")}</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/warehouse/equipment" className={linkCls(pathname === '/dashboard/warehouse/equipment')}>
                      <IconEquipment />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Оборудование")}</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/warehouse/requests" className={linkCls(pathname === '/dashboard/warehouse/requests')}>
                      <IconRequests />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Заявки")}</span>
                    </NavLink>
                  </li>
                </>
              )}

              {/* Accountant extras */}
              {isAccountant && (
                <>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/accountant/payments" className={linkCls(pathname === '/dashboard/accountant/payments')}>
                      <IconPayments />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Платежи")}</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/accountant/budgets" className={linkCls(pathname === '/dashboard/accountant/budgets')}>
                      <IconBudgets />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Бюджеты")}</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/accountant/salaries" className={linkCls(pathname === '/dashboard/accountant/salaries')}>
                      <IconSalaries />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Зарплаты")}</span>
                    </NavLink>
                  </li>
                </>
              )}

              {/* Inspector extras */}
              {isInspector && (
                <>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/inspector/inspections" className={linkCls(pathname === '/dashboard/inspector/inspections')}>
                      <IconInspections />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Инспекции")}</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/inspector/defects" className={linkCls(pathname === '/dashboard/inspector/defects')}>
                      <IconDefects />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Дефекты")}</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/inspector/construction-sites" className={linkCls(pathname === '/dashboard/inspector/construction-sites')}>
                      <IconSite />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Стройплощадки")}</span>
                    </NavLink>
                  </li>
                </>
              )}

              {/* Finance — для admin/super_admin/accountant/PM */}
              {(isSuperAdmin || isAdmin || isAccountant || isPM) && (
                <li className="mb-1 last:mb-0">
                  <NavLink href="/dashboard/finance" className={linkCls(pathname.startsWith('/dashboard/finance'))}>
                    <IconFinance />
                    <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Финансы")}</span>
                  </NavLink>
                </li>
              )}

              {/* Warehouse — для admin/super_admin/PM/foreman/warehouse_keeper */}
              {(isSuperAdmin || isAdmin || isPM || isForeman || isWarehouse) && (
                <li className="mb-1 last:mb-0">
                  <NavLink href="/dashboard/warehouse" className={linkCls(pathname === '/dashboard/warehouse' || pathname.startsWith('/dashboard/warehouse'))}>
                    <IconWarehouse />
                    <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Склад")}</span>
                  </NavLink>
                </li>
              )}

              {/* Documents */}
              <li className="mb-1 last:mb-0">
                <NavLink href="/dashboard/documents" hotkey={hkByHref['/dashboard/documents']} className={linkCls(pathname === '/dashboard/documents')}>
                  <IconDocuments />
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Документы")}</span>
                </NavLink>
              </li>

              {/* Media */}
              <li className="mb-1 last:mb-0">
                <NavLink href="/dashboard/media" className={linkCls(pathname === '/dashboard/media')}>
                  <IconMedia />
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Медиа")}</span>
                </NavLink>
              </li>

              {/* Learning Library */}
              <li className="mb-1 last:mb-0">
                <NavLink href="/dashboard/learning" className={linkCls(pathname.startsWith('/dashboard/learning'))}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Обучение")}</span>
                </NavLink>
              </li>

              {/* Unified Wiki */}
              <li className="mb-1 last:mb-0">
                <NavLink href="/dashboard/wiki" className={linkCls(pathname.startsWith('/dashboard/wiki'))}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25M9 9.75h.008v.008H9V9.75Zm0 3h.008v.008H9v-.008Z" />
                  </svg>
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("ВИКИ")}</span>
                </NavLink>
              </li>

              {/* Safety Briefings — Инструктажи */}
              <li className="mb-1 last:mb-0">
                <NavLink href="/dashboard/safety-briefings" className={linkCls(pathname.startsWith('/dashboard/safety-briefings'))}>
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                  </svg>
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Инструктажи")}</span>
                </NavLink>
              </li>

              {/* Технадзор — раскрывающаяся группа */}
              {showTechnadzor && (
                <SidebarLinkGroup activecondition={pathname.startsWith('/dashboard/technadzor')}>
                  {(handleClick, open) => (
                    <>
                      <a
                        href="#0"
                        onClick={(e) => { e.preventDefault(); handleClick(); }}
                        className={`flex items-center justify-between gap-3 py-2 px-3 -mx-3 rounded-lg transition duration-150 ${
                          pathname.startsWith('/dashboard/technadzor')
                            ? 'text-violet-500'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        <span className="flex items-center gap-3 truncate">
                          <IconTechnadzor />
                          <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t('Технадзор')}</span>
                        </span>
                        <svg
                          className={`w-3 h-3 shrink-0 fill-current text-gray-400 lg:opacity-0 lg:sidebar-expanded:opacity-100 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                          viewBox="0 0 12 12"
                        >
                          <path d="M5.9 11.4L.5 6l1.4-1.4 4 4 4-4L11.3 6z" />
                        </svg>
                      </a>
                      {open && (
                        <div className="lg:hidden lg:sidebar-expanded:block mt-1">
                          <ul className="pl-4">
                            {[
                              { header: 'Проверки' },
                              { href: '/dashboard/technadzor/inspections', label: 'Мои инспекции' },
                              { href: '/dashboard/technadzor/inspections/assigned', label: 'Назначенные мне' },
                              { href: '/dashboard/technadzor/inspections/control', label: 'На контроле' },
                              { href: '/dashboard/technadzor/inspections/all', label: 'Все инспекции' },
                              { href: '/dashboard/technadzor/calendar', label: 'Календарь' },
                              { header: 'Дефекты' },
                              { href: '/dashboard/technadzor/defects', label: 'Все дефекты' },
                              { href: '/dashboard/technadzor/defects/assigned', label: 'Назначенные мне' },
                              { href: '/dashboard/technadzor/defects/control', label: 'На контроле' },
                              { header: 'Отчёты' },
                              { href: '/dashboard/technadzor/analytics', label: 'Аналитика' },
                              { href: '/dashboard/technadzor/reports', label: 'PDF отчёты' },
                              { header: 'Справочники' },
                              { href: '/dashboard/technadzor/templates', label: 'Шаблоны инспекций' },
                              { href: '/dashboard/technadzor/control-points', label: 'Пункты контроля' },
                              { href: '/dashboard/technadzor/norms', label: 'Нормативы (ГОСТ, СП)' },
                              { href: '/dashboard/technadzor/contractors', label: 'Подрядчики' },
                              { href: '/dashboard/technadzor/objects', label: 'Объекты' },
                            ].map((it, i) =>
                              'header' in it ? (
                                <li key={`h-${i}`} className="px-3 pt-3 pb-1 first:pt-1">
                                  <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-400 dark:text-gray-500">{t(it.header!)}</span>
                                </li>
                              ) : (
                                <li key={it.href} className="mb-0.5 last:mb-0">
                                  <NavLink
                                    href={it.href!}
                                    className={`flex items-center py-1.5 px-3 rounded-lg text-sm transition duration-150 truncate ${
                                      pathname === it.href
                                        ? 'text-violet-500 bg-violet-50 dark:bg-violet-500/10'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                                  >
                                    {t(it.label!)}
                                  </NavLink>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </SidebarLinkGroup>
              )}

              {/* HSE — Охрана труда */}
              <li className="mb-1 last:mb-0">
                <NavLink
                  href="/dashboard/hse"
                  className={linkCls(pathname.startsWith('/dashboard/hse'))}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Охрана труда")}</span>
                </NavLink>
              </li>

              {/* Chat */}
              {showChat && (
                <li className="mb-1 last:mb-0">
                  <NavLink href="/dashboard/chat" hotkey={hkByHref['/dashboard/chat']} className={linkCls(pathname === '/dashboard/chat')}>
                    <div className="relative shrink-0">
                      <IconChat />
                      {chatUnread > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full">
                          {chatUnread > 99 ? '99+' : chatUnread}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Чат")}</span>
                  </NavLink>
                </li>
              )}

              {/* Company (admin + super_admin) */}
              {(isAdmin || isSuperAdmin) && (
                <li className="mb-1 last:mb-0">
                  <NavLink href="/dashboard/company" hotkey={hkByHref['/dashboard/company']} className={linkCls(pathname === '/dashboard/company')}>
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                    </svg>
                    <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Компания")}</span>
                  </NavLink>
                </li>
              )}

              {/* Settings */}
              <li className="mb-1 last:mb-0">
                <NavLink
                  href={settingsHref}
                  hotkey={hkByHref[settingsHref]}
                  className={linkCls(pathname === '/admin/settings' || pathname === '/dashboard/settings')}
                >
                  <IconSettings />
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Настройки")}</span>
                </NavLink>
              </li>

              {/* Admin (super_admin only) */}
              {isSuperAdmin && (
                <li className="mb-1 last:mb-0">
                  <NavLink href="/admin" hotkey={hkByHref['/admin']} className={linkCls(pathname.startsWith('/admin') && pathname !== '/admin/settings')}>
                    <svg
                      className="w-5 h-5 shrink-0 fill-current"
                      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
                    >
                      <path d="M12 1a1 1 0 1 0-2 0v2a3 3 0 0 0 3 3h2a1 1 0 1 0 0-2h-2a1 1 0 0 1-1-1V1ZM1 10a1 1 0 1 0 0 2h2a1 1 0 0 1 1 1v2a1 1 0 1 0 2 0v-2a3 3 0 0 0-3-3H1ZM5 0a1 1 0 0 1 1 1v2a3 3 0 0 1-3 3H1a1 1 0 0 1 0-2h2a1 1 0 0 0 1-1V1a1 1 0 0 1 1-1ZM12 13a1 1 0 0 1 1-1h2a1 1 0 1 0 0-2h-2a3 3 0 0 0-3 3v2a1 1 0 1 0 2 0v-2Z" />
                    </svg>
                    <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">{t("Администрирование")}</span>
                  </NavLink>
                </li>
              )}
            </ul>
          </div>
        </div>
        </div>{/* end scrollable nav */}

        {/* Bottom nav items: notifications, theme, profile */}
        <div className="shrink-0 px-4 pb-2">
          <div className="border-t border-gray-100 dark:border-gray-700 mb-2" />
          <ul className="space-y-0.5">
            <li><NotificationDropdown navItem /></li>
            <li><ThemeToggle navItem /></li>
            <li><ProfileDropdown navItem /></li>
          </ul>
        </div>

        {/* Expand / collapse button */}
        <div className="shrink-0 hidden lg:flex justify-center lg:sidebar-expanded:justify-end border-t border-gray-100 dark:border-gray-700 px-4 py-2">
          <div className="py-1">
            <button
              className="cursor-pointer text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
            >
              <span className="sr-only">Expand / collapse sidebar</span>
              {/* arrow points RIGHT (→) by default = expand; when expanded rotates 180° to point LEFT (←) = collapse */}
              <svg className="shrink-0 fill-current text-gray-400 dark:text-gray-500 rotate-180 sidebar-expanded:rotate-0 transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                <path d="M6.7 14.7l1.4-1.4L3.8 9H16V7H3.8l4.3-4.3-1.4-1.4L0 8z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
