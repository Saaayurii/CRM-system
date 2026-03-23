'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Transition from '@/components/ui/Transition';
import { useNotificationStore } from '@/stores/notificationStore';
import { getPermissionState } from '@/lib/pushNotifications';

// Icon per notification type
function NotifIcon({ type }: { type?: string }) {
  const cls = 'w-4 h-4 shrink-0 mt-0.5';
  switch (type) {
    case 'task_assigned':
    case 'task_updated':
    case 'task_completed':
    case 'task_overdue':
      return (
        <svg className={`${cls} text-blue-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'payment_received':
    case 'payment_overdue':
    case 'budget_exceeded':
    case 'invoice_created':
      return (
        <svg className={`${cls} text-green-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'inspection_failed':
    case 'defect_found':
    case 'system_alert':
      return (
        <svg className={`${cls} text-red-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
    case 'chat_message':
      return (
        <svg className={`${cls} text-indigo-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      );
    case 'announcement':
      return (
        <svg className={`${cls} text-violet-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      );
    case 'material_low_stock':
    case 'material_received':
      return (
        <svg className={`${cls} text-yellow-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      );
    default:
      return (
        <svg className={`${cls} text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      );
  }
}

export default function NotificationDropdown() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    isLoading,
    pushSupported,
    pushEnabled,
    pushLoading,
    pushPermission,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    connectSSE,
    disconnectSSE,
    checkPushStatus,
    togglePush,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
    connectSSE();
    checkPushStatus();
    return () => disconnectSSE();
  }, [fetchNotifications, connectSSE, disconnectSSE, checkPushStatus]);

  // Close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!dropdown.current) return;
      if (!dropdownOpen || dropdown.current.contains(target as Node) || trigger.current?.contains(target as Node))
        return;
      setDropdownOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  // Close on Escape
  useEffect(() => {
    const keyHandler = ({ key }: KeyboardEvent) => {
      if (!dropdownOpen || key !== 'Escape') return;
      setDropdownOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  const handleToggle = useCallback(() => {
    if (!dropdownOpen) fetchNotifications();
    setDropdownOpen((prev) => !prev);
  }, [dropdownOpen, fetchNotifications]);

  const handleNotificationClick = useCallback(
    (notification: { id: number; actionUrl?: string; isRead: boolean }) => {
      if (!notification.isRead) markAsRead(notification.id);
      if (notification.actionUrl) window.location.href = notification.actionUrl;
    },
    [markAsRead],
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMin < 1) return 'только что';
    if (diffMin < 60) return `${diffMin} мин. назад`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} ч. назад`;
    return `${Math.floor(diffHours / 24)} дн. назад`;
  };

  // Push toggle tooltip
  const pushDenied = pushPermission === 'denied';
  const pushTitle = pushDenied
    ? 'Уведомления заблокированы в настройках браузера'
    : pushEnabled
      ? 'Отключить push-уведомления'
      : 'Включить push-уведомления';

  return (
    <div className="relative inline-flex">
      <button
        ref={trigger}
        className="relative w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-full transition-colors cursor-pointer"
        aria-haspopup="true"
        onClick={handleToggle}
        aria-expanded={dropdownOpen}
      >
        <span className="sr-only">Уведомления</span>
        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Transition
        className="origin-top-right z-10 absolute top-full min-w-80 max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-xl shadow-xl overflow-hidden mt-1 right-0"
        show={dropdownOpen}
        enter="transition ease-out duration-200 transform"
        enterStart="opacity-0 -translate-y-2"
        enterEnd="opacity-100 translate-y-0"
        leave="transition ease-out duration-200"
        leaveStart="opacity-100"
        leaveEnd="opacity-0"
      >
        <div ref={dropdown}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700/60">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Уведомления</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                >
                  Прочитать все
                </button>
              )}
              {/* Push toggle */}
              {pushSupported && (
                <button
                  onClick={() => togglePush()}
                  disabled={pushDenied || pushLoading}
                  title={pushTitle}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    pushEnabled
                      ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {pushLoading ? (
                    <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : pushEnabled ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 003.844.148m-3.844-.148a23.856 23.856 0 01-5.455-1.31 8.964 8.964 0 002.3-5.542m3.155 6.852a3 3 0 005.667 1.329m1.010-10.562a6 6 0 00-9.928 5.573" />
                    </svg>
                  )}
                  <span>{pushEnabled ? 'Push вкл.' : 'Push'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Загрузка...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <svg className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">Нет уведомлений</p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors border-b border-gray-100 dark:border-gray-700/40 last:border-0 ${
                        !n.isRead ? 'bg-violet-50/50 dark:bg-violet-500/5' : ''
                      }`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="flex items-start gap-2.5">
                        <NotifIcon type={n.notificationType} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-tight">
                              {n.title}
                            </p>
                            {!n.isRead && (
                              <span className="mt-1 w-2 h-2 bg-violet-500 rounded-full shrink-0" />
                            )}
                          </div>
                          {n.message && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {formatTime(n.createdAt)}
                            </p>
                            {n.priority === 3 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 rounded font-medium">
                                Срочно
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {pushSupported && !pushEnabled && pushPermission !== 'denied' && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700/60 bg-violet-50/50 dark:bg-violet-500/5">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Включите push-уведомления, чтобы получать сообщения даже когда приложение закрыто.
              </p>
              <button
                onClick={() => togglePush()}
                disabled={pushLoading}
                className="w-full text-sm py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-white font-medium transition-colors disabled:opacity-50"
              >
                Включить уведомления
              </button>
            </div>
          )}
        </div>
      </Transition>
    </div>
  );
}
