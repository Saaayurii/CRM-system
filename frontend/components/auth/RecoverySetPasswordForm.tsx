'use client';

import { useState } from 'react';
import { useT } from '@/lib/i18n';

export interface RecoverableAccount {
  userId: number;
  accountId: number;
  companyName: string;
  roleId: number | null;
  roleName: string | null;
  isClientPortal: boolean;
}

interface Props {
  accounts: RecoverableAccount[];
  submitting: boolean;
  error: string;
  onSubmit: (userIds: number[], password: string) => void;
}

/**
 * Shared final step of account recovery (email link & SMS code flows):
 * pick which accounts to recover (when there are several) and set a new password.
 */
export default function RecoverySetPasswordForm({ accounts, submitting, error, onSubmit }: Props) {
  const t = useT();
  const [selected, setSelected] = useState<number[]>(accounts.map((a) => a.userId));
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const toggle = (userId: number) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (selected.length === 0) {
      setLocalError('Выберите хотя бы один аккаунт для восстановления');
      return;
    }
    if (password.length < 8) {
      setLocalError('Пароль должен быть не короче 8 символов');
      return;
    }
    if (password !== confirm) {
      setLocalError('Пароли не совпадают');
      return;
    }
    onSubmit(selected, password);
  };

  const shownError = localError || error;

  return (
    <form onSubmit={handleSubmit}>
      {shownError && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-3 text-sm text-red-600 dark:text-red-400">
          {shownError}
        </div>
      )}

      {accounts.length > 1 && (
        <div className="mb-5">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Аккаунты для восстановления
          </label>
          <div className="space-y-2">
            {accounts.map((a) => (
              <label
                key={a.userId}
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selected.includes(a.userId)
                    ? 'border-violet-400 bg-violet-50 dark:bg-violet-500/10 dark:border-violet-500/50'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="checkbox"
                  className="form-checkbox text-violet-500"
                  checked={selected.includes(a.userId)}
                  onChange={() => toggle(a.userId)}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {a.companyName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {a.isClientPortal ? 'Клиентский портал' : a.roleName || 'Сотрудник'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor="password">
            Новый пароль
          </label>
          <div className="relative">
            <input
              id="password"
              className="form-input w-full pr-10"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('Минимум 8 символов')}
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300" htmlFor="confirm">
            Повторите пароль
          </label>
          <input
            id="confirm"
            className="form-input w-full"
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          className="btn bg-violet-500 hover:bg-violet-600 text-white w-full"
          disabled={submitting}
        >
          {submitting ? (
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            'Сохранить новый пароль'
          )}
        </button>
      </div>
    </form>
  );
}
