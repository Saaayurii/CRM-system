'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname } from 'next/navigation';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useAuthStore } from '@/stores/authStore';
import SidebarLinkGroup from './SidebarLinkGroup';

function NavLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const { setSidebarOpen } = useSidebarStore();
  return (
    <Link href={href} className={className} onClick={() => setSidebarOpen(false)}>
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
function IconHRDocs() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
    </svg>
  );
}

/* ─── link class helper ─── */
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
  const showTeams = isSuperAdmin || roleCode === 'admin' || isPM || isHR;
  const showChat = !isSuperAdmin;

  const trigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLDivElement>(null);

  useEffect(() => { initialize(); }, [initialize]);

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
        className={`flex lg:flex! flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-[100dvh] overflow-y-scroll lg:overflow-y-auto no-scrollbar w-64 lg:w-20 lg:sidebar-expanded:!w-64 shrink-0 bg-white dark:bg-gray-800 p-4 transition-all duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-64'} rounded-r-2xl shadow-xs`}
      >
        {/* Header */}
        <div className="flex justify-between mb-10 pr-3 sm:px-2">
          <button
            ref={trigger}
            className="lg:hidden text-gray-500 hover:text-gray-400"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
          >
            <span className="sr-only">Close sidebar</span>
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M10.7 18.7l1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4L4 12z" /></svg>
          </button>
          <NavLink href="/" className="block">
            <NextImage
              src="/logo-icon.png"
              alt="3|15 Строительство и Ремонт"
              width={40}
              height={40}
              className="rounded-lg shrink-0"
            />
          </NavLink>
        </div>

        {/* Nav links */}
        <div className="space-y-8">
          <div>
            <h3 className="text-xs uppercase text-gray-400 dark:text-gray-500 font-semibold pl-3">
              <span className="hidden lg:block lg:sidebar-expanded:hidden text-center w-6" aria-hidden="true">&bull;&bull;&bull;</span>
              <span className="lg:hidden lg:sidebar-expanded:block">Меню</span>
            </h3>
            <ul className="mt-3">

              {/* Overview */}
              <li className="mb-1 last:mb-0">
                <NavLink href="/dashboard" className={linkCls(pathname === '/dashboard')}>
                  <IconDashboard />
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Обзор</span>
                </NavLink>
              </li>

              {/* Projects */}
              <li className="mb-1 last:mb-0">
                <NavLink href="/dashboard/projects" className={linkCls(pathname.startsWith('/dashboard/projects'))}>
                  <IconProjects />
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Проекты</span>
                </NavLink>
              </li>

              {/* Tasks */}
              <li className="mb-1 last:mb-0">
                <NavLink href="/dashboard/tasks" className={linkCls(pathname === '/dashboard/tasks')}>
                  <IconTasks />
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Задачи</span>
                </NavLink>
              </li>

              {/* Employees */}
              <li className="mb-1 last:mb-0">
                <NavLink href="/dashboard/employees" className={linkCls(pathname === '/dashboard/employees')}>
                  <IconEmployees />
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Сотрудники</span>
                </NavLink>
              </li>

              {/* PM extras */}
              {isPM && (
                <li className="mb-1 last:mb-0">
                  <NavLink href="/dashboard/pm/construction-sites" className={linkCls(pathname === '/dashboard/pm/construction-sites')}>
                    <IconSite />
                    <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Стройплощадки</span>
                  </NavLink>
                </li>
              )}

              {/* HR extras */}
              {isHR && (
                <>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/hr/attendance" className={linkCls(pathname === '/dashboard/hr/attendance')}>
                      <IconAttendance />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Посещаемость</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/hr/time-off" className={linkCls(pathname === '/dashboard/hr/time-off')}>
                      <IconTimeOff />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Отпуска</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/hr/documents" className={linkCls(pathname === '/dashboard/hr/documents')}>
                      <IconHRDocs />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Документы сотрудников</span>
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
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Стройплощадки</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/foreman/equipment" className={linkCls(pathname === '/dashboard/foreman/equipment')}>
                      <IconEquipment />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Оборудование</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/foreman/inspections" className={linkCls(pathname === '/dashboard/foreman/inspections')}>
                      <IconInspections />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Проверки</span>
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
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Посещаемость</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/worker/time-off" className={linkCls(pathname === '/dashboard/worker/time-off')}>
                      <IconTimeOff />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Отпуска</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/worker/construction-sites" className={linkCls(pathname === '/dashboard/worker/construction-sites')}>
                      <IconSite />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Стройплощадки</span>
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
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Поставщики</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/supplier/orders" className={linkCls(pathname === '/dashboard/supplier/orders')}>
                      <IconOrders />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Заказы</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/supplier/materials" className={linkCls(pathname === '/dashboard/supplier/materials')}>
                      <IconMaterials />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Материалы</span>
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
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Материалы</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/warehouse/equipment" className={linkCls(pathname === '/dashboard/warehouse/equipment')}>
                      <IconEquipment />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Оборудование</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/warehouse/requests" className={linkCls(pathname === '/dashboard/warehouse/requests')}>
                      <IconRequests />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Заявки</span>
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
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Платежи</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/accountant/budgets" className={linkCls(pathname === '/dashboard/accountant/budgets')}>
                      <IconBudgets />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Бюджеты</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/accountant/salaries" className={linkCls(pathname === '/dashboard/accountant/salaries')}>
                      <IconSalaries />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Зарплаты</span>
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
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Инспекции</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/inspector/defects" className={linkCls(pathname === '/dashboard/inspector/defects')}>
                      <IconDefects />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Дефекты</span>
                    </NavLink>
                  </li>
                  <li className="mb-1 last:mb-0">
                    <NavLink href="/dashboard/inspector/construction-sites" className={linkCls(pathname === '/dashboard/inspector/construction-sites')}>
                      <IconSite />
                      <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Стройплощадки</span>
                    </NavLink>
                  </li>
                </>
              )}

              {/* Documents */}
              <li className="mb-1 last:mb-0">
                <NavLink href="/dashboard/documents" className={linkCls(pathname === '/dashboard/documents')}>
                  <IconDocuments />
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Документы</span>
                </NavLink>
              </li>

              {/* Teams */}
              {showTeams && (
                <li className="mb-1 last:mb-0">
                  <NavLink href="/dashboard/teams" className={linkCls(pathname === '/dashboard/teams')}>
                    <IconTeams />
                    <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Команды</span>
                  </NavLink>
                </li>
              )}

              {/* Chat */}
              {showChat && (
                <li className="mb-1 last:mb-0">
                  <NavLink href="/dashboard/chat" className={linkCls(pathname === '/dashboard/chat')}>
                    <IconChat />
                    <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Чат</span>
                  </NavLink>
                </li>
              )}

              {/* Settings */}
              <li className="mb-1 last:mb-0">
                <NavLink
                  href={isSuperAdmin ? '/admin/settings' : '/dashboard/settings'}
                  className={linkCls(pathname === '/admin/settings' || pathname === '/dashboard/settings')}
                >
                  <IconSettings />
                  <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Настройки</span>
                </NavLink>
              </li>

              {/* Admin (super_admin only) */}
              {isSuperAdmin && (
                <li className="mb-1 last:mb-0">
                  <NavLink href="/admin" className={linkCls(pathname.startsWith('/admin') && pathname !== '/admin/settings')}>
                    <svg
                      className="w-5 h-5 shrink-0 fill-current"
                      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"
                    >
                      <path d="M12 1a1 1 0 1 0-2 0v2a3 3 0 0 0 3 3h2a1 1 0 1 0 0-2h-2a1 1 0 0 1-1-1V1ZM1 10a1 1 0 1 0 0 2h2a1 1 0 0 1 1 1v2a1 1 0 1 0 2 0v-2a3 3 0 0 0-3-3H1ZM5 0a1 1 0 0 1 1 1v2a3 3 0 0 1-3 3H1a1 1 0 0 1 0-2h2a1 1 0 0 0 1-1V1a1 1 0 0 1 1-1ZM12 13a1 1 0 0 1 1-1h2a1 1 0 1 0 0-2h-2a3 3 0 0 0-3 3v2a1 1 0 1 0 2 0v-2Z" />
                    </svg>
                    <span className="text-sm font-medium lg:opacity-0 lg:sidebar-expanded:opacity-100 duration-200">Администрирование</span>
                  </NavLink>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Expand / collapse button */}
        <div className="pt-3 hidden lg:inline-flex justify-end mt-auto">
          <div className="w-12 pl-4 pr-3 py-2">
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
