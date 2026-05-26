'use client';

import {
  CopyButton,
  EmployeeAvatar,
  EmployeeData,
  ModalShell,
  OnlineBadge,
} from './shared';

interface Props {
  employee: EmployeeData;
  canEdit?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onOpenFullProfile?: () => void;
}

export default function EmployeeQuickViewModal({
  employee,
  canEdit = true,
  onClose,
  onEdit,
  onOpenFullProfile,
}: Props) {
  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <div className="p-6">
        {/* Header actions */}
        <div className="flex items-start justify-end gap-1 -mt-1 -mr-1 mb-1">
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title="Редактировать"
              className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onOpenFullProfile && (
            <button
              type="button"
              onClick={onOpenFullProfile}
              title="Полный профиль"
              className="p-1.5 text-gray-400 hover:text-violet-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Закрыть"
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Identity */}
        <div className="flex items-start gap-4">
          <EmployeeAvatar employee={employee} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 leading-tight">
              {employee.name || '—'}
            </h2>
            {employee.position && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {employee.position}
              </p>
            )}
            <div className="mt-2">
              <OnlineBadge employee={employee} />
            </div>
          </div>
        </div>

        {/* Contact chips */}
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {employee.phone && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <a
                href={`tel:${employee.phone}`}
                className="text-sm text-gray-700 dark:text-gray-200 truncate hover:text-violet-600 dark:hover:text-violet-400"
                title={employee.phone}
              >
                {employee.phone}
              </a>
              <CopyButton value={employee.phone} title="Скопировать телефон" />
            </div>
          )}

          {employee.email && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <a
                href={`mailto:${employee.email}`}
                className="text-sm text-gray-700 dark:text-gray-200 truncate hover:text-violet-600 dark:hover:text-violet-400"
                title={employee.email}
              >
                {employee.email}
              </a>
              <CopyButton value={employee.email} title="Скопировать email" />
            </div>
          )}

          {employee.position && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" />
                </svg>
              </div>
              <span
                className="text-sm text-gray-700 dark:text-gray-200 truncate"
                title={employee.position}
              >
                {employee.position}
              </span>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
