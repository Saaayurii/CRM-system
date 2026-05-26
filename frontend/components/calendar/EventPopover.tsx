'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  FeedEvent,
  PRIORITY_COLOR,
  cleanTitle,
  isOverdueEvent,
  normalizePriority,
  resolveTypeMeta,
} from './types';

interface Props {
  event: FeedEvent;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onOpenEditor?: () => void;
}

function formatRange(ev: FeedEvent): string {
  const s = new Date(ev.start);
  const e = ev.end ? new Date(ev.end) : null;
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  if (ev.allDay) {
    if (!e || isSameDay(s, e)) return fmtDate(s);
    return `${fmtDate(s)} → ${fmtDate(e)}`;
  }
  if (!e || isSameDay(s, e)) {
    return `${fmtDate(s)}, ${fmtTime(s)}${e ? `—${fmtTime(e)}` : ''}`;
  }
  return `${fmtDate(s)} ${fmtTime(s)} → ${fmtDate(e)} ${fmtTime(e)}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function EventPopover({ event, anchorRect, onClose, onOpenEditor }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchorRect || !ref.current) return;
    const w = ref.current.offsetWidth || 320;
    const h = ref.current.offsetHeight || 160;
    const margin = 8;
    let left = anchorRect.left + anchorRect.width / 2 - w / 2 + window.scrollX;
    let top = anchorRect.bottom + margin + window.scrollY;

    left = Math.max(margin + window.scrollX, Math.min(left, window.innerWidth - w - margin + window.scrollX));
    if (top + h > window.innerHeight + window.scrollY - margin) {
      top = anchorRect.top - h - margin + window.scrollY;
    }
    setPos({ top, left });
  }, [anchorRect]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', onDocClick), 0);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [onClose]);

  const meta = resolveTypeMeta(event.sourceType);
  const overdue = isOverdueEvent(event);
  const prio = normalizePriority(event.extendedProps?.priority);
  const props = event.extendedProps || {};
  const isEditable = event.editable;

  return (
    <div
      ref={ref}
      role="dialog"
      style={pos ? { top: pos.top, left: pos.left, position: 'absolute', zIndex: 60 } : { visibility: 'hidden', position: 'absolute' }}
      className="w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: `${meta.color}1a`, borderBottom: `2px solid ${meta.color}` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full text-white"
            style={{ background: meta.color }}
          >
            {meta.label}
          </span>
          {overdue && (
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-red-600 text-white">
              Просрочено
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-100 text-sm"
          title="Закрыть"
        >
          ✕
        </button>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 leading-snug break-words">
          {cleanTitle(event.title)}
        </h3>

        <Row label="Когда" value={formatRange(event)} />
        {props.location && <Row label="Место" value={props.location} />}
        {prio && (
          <Row
            label="Приоритет"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: PRIORITY_COLOR[prio] }}
                />
                {prio === 'low' && 'Низкий'}
                {prio === 'medium' && 'Средний'}
                {prio === 'high' && 'Высокий'}
                {prio === 'urgent' && 'Критичный'}
              </span>
            }
          />
        )}
        {event.status && <Row label="Статус" value={String(event.status)} />}
        {event.projectId && <Row label="Проект" value={`#${event.projectId}`} />}
        {props.description && (
          <div className="text-xs text-gray-600 dark:text-gray-300 pt-1 border-t border-gray-100 dark:border-gray-700 line-clamp-3">
            {props.description}
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-2">
        {event.url ? (
          <Link
            href={event.url}
            className="px-3 py-1.5 text-xs rounded-md bg-violet-500 hover:bg-violet-600 text-white"
          >
            Открыть
          </Link>
        ) : isEditable && onOpenEditor ? (
          <button
            onClick={() => onOpenEditor()}
            className="px-3 py-1.5 text-xs rounded-md bg-violet-500 hover:bg-violet-600 text-white"
          >
            Редактировать
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-xs">
      <span className="w-20 shrink-0 text-gray-400 dark:text-gray-500">{label}</span>
      <span className="text-gray-700 dark:text-gray-200 break-words min-w-0">{value}</span>
    </div>
  );
}
