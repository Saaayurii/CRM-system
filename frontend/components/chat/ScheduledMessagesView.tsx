'use client';

import { useEffect, useMemo, useState } from 'react';
import { useChatStore, ChatChannel, ScheduledMessage } from '@/stores/chatStore';
import { useT } from '@/lib/i18n';

interface ScheduledMessagesViewProps {
  channel: ChatChannel;
  onBack: () => void;
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function dayLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Экран «Отложенная отправка»: список запланированных сообщений с разделителями
 * по дате отправки и действиями (отправить сейчас / удалить).
 */
export default function ScheduledMessagesView({ channel, onBack }: ScheduledMessagesViewProps) {
  const t = useT();
  const list = useChatStore((s) => s.scheduledByChannel[channel.id]) as ScheduledMessage[] | undefined;
  const fetchScheduled = useChatStore((s) => s.fetchScheduled);
  const cancelScheduled = useChatStore((s) => s.cancelScheduled);
  const sendScheduledNow = useChatStore((s) => s.sendScheduledNow);
  const [menuId, setMenuId] = useState<number | null>(null);

  useEffect(() => {
    fetchScheduled(channel.id);
  }, [channel.id, fetchScheduled]);

  // Пустой список — закрываем экран (например, все отправлены/удалены)
  useEffect(() => {
    if (list && list.length === 0) onBack();
  }, [list, onBack]);

  // Группировка по дню отправки
  const groups = useMemo(() => {
    const map = new Map<string, ScheduledMessage[]>();
    (list ?? []).forEach((m) => {
      const key = dayLabel(m.scheduledAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries());
  }, [list]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[#0e1621] dark:bg-[#0e1621]">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3 border-b border-gray-800 shrink-0">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:bg-white/5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-100">{t('Отложенная отправка')}</p>
          <p className="text-xs text-gray-400">{(list?.length ?? 0)} {t('сообщ.')}</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" onClick={() => setMenuId(null)}>
        {(!list || list.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-gray-400">{t('Нет отложенных сообщений')}</p>
          </div>
        )}

        {groups.map(([day, items]) => (
          <div key={day} className="space-y-3">
            <div className="flex justify-center">
              <span className="text-xs text-gray-300 bg-black/30 rounded-full px-3 py-1">{t('Отправка')} {day}</span>
            </div>
            {items.map((m) => (
              <div key={m.id} className="flex justify-end">
                <div className="relative max-w-[75%]">
                  <div className="rounded-2xl rounded-br-md bg-[#2b5278] text-white px-3 py-2 shadow">
                    {m.messageText && <p className="text-sm whitespace-pre-wrap break-words">{m.messageText}</p>}
                    {m.attachments?.length > 0 && (
                      <p className="text-xs text-white/70 mt-0.5">📎 {m.attachments.length} {t('влож.')}</p>
                    )}
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      {m.silent && (
                        <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M15 17h5l-1.405-1.405A2 2 0 0118 14.16V11a6 6 0 00-4-5.66" />
                        </svg>
                      )}
                      <span className="text-[10px] text-white/60">{timeLabel(m.scheduledAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuId(menuId === m.id ? null : m.id); }}
                    className="absolute -left-9 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10"
                    title={t('Действия')}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4z" /></svg>
                  </button>
                  {menuId === m.id && (
                    <div className="absolute right-0 top-full mt-1 z-10 w-48 py-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setMenuId(null); sendScheduledNow(channel.id, m.id); }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t('Отправить сейчас')}
                      </button>
                      <button
                        onClick={() => { setMenuId(null); cancelScheduled(channel.id, m.id); }}
                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        {t('Удалить')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
