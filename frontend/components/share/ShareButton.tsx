'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';
import { useToastStore } from '@/stores/toastStore';
import {
  ShareLink,
  listShareLinks,
  createShareLink,
  revokeShareLink,
  shareUrl,
} from '@/lib/share';

interface ShareButtonProps {
  entityType: string;
  entityId: number;
  title?: string;
  // Внешний вид триггера
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
}

export default function ShareButton({
  entityType,
  entityId,
  title,
  variant = 'secondary',
  size = 'sm',
  className,
  label = 'Поделиться',
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <svg className="w-4 h-4 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
        {label}
      </Button>
      {open && (
        <ShareModal
          entityType={entityType}
          entityId={entityId}
          title={title}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function ShareModal({
  entityType,
  entityId,
  title,
  onClose,
}: {
  entityType: string;
  entityId: number;
  title?: string;
  onClose: () => void;
}) {
  const toast = useToastStore((s) => s.addToast);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLinks(await listShareLinks(entityType, entityId));
    } catch {
      toast('error', 'Не удалось загрузить ссылки');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const link = await createShareLink({
        entityType,
        entityId,
        title,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setLinks((prev) => [link, ...prev]);
      setExpiresAt('');
      try {
        await navigator.clipboard.writeText(shareUrl(link.token));
        toast('success', 'Ссылка создана и скопирована');
      } catch {
        toast('success', 'Ссылка создана');
      }
    } catch {
      toast('error', 'Не удалось создать ссылку');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      toast('success', 'Скопировано');
    } catch {
      toast('error', 'Не удалось скопировать');
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await revokeShareLink(id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
      toast('success', 'Ссылка отозвана');
    } catch {
      toast('error', 'Не удалось отозвать');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700/60 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
            Внешние ссылки
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Закрыть"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Любой человек с ссылкой сможет открыть эту запись в режиме просмотра, без входа в систему. Ссылку можно отозвать в любой момент.
          </p>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Срок действия (необязательно)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="form-input w-full text-sm"
              />
            </div>
            <Button onClick={handleCreate} loading={creating}>
              Создать ссылку
            </Button>
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-gray-400">Загрузка…</p>
            ) : links.length === 0 ? (
              <p className="text-sm text-gray-400">Ссылок пока нет.</p>
            ) : (
              links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/40"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono truncate text-gray-700 dark:text-gray-300">
                      {shareUrl(link.token)}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Открытий: {link.viewCount}
                      {link.expiresAt
                        ? ` · до ${new Date(link.expiresAt).toLocaleDateString('ru-RU')}`
                        : ' · бессрочно'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(link.token)}
                    className="text-xs px-2 py-1 rounded text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                  >
                    Копировать
                  </button>
                  <button
                    onClick={() => handleRevoke(link.id)}
                    className="text-xs px-2 py-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    Отозвать
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
