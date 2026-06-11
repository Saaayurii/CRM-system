'use client';

import { cleanTitle, normalizePriority, PRIORITY_COLOR, resolveTypeMeta } from './types';
import { useT } from '@/lib/i18n';

interface Props {
  title: string;
  sourceType?: string;
  priority?: any;
  /** Время начала (HH:MM) — показываем в timegrid/week-view. */
  timeText?: string;
  /** Если true — рисуем как «pill» с заливкой, иначе тонкая полоска. */
  filled?: boolean;
  /** Сокращать ли заголовок до 1 строки. */
  compact?: boolean;
}

function Icon({ name, className }: { name: string; className?: string }) {
  const t = useT();
  switch (name) {
    case 'task':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      );
    case 'inspection':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case 'time_off':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Zm9-5v5l3 2" />
        </svg>
      );
    case 'milestone':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.4 5.6L20 9l-4.4 3.8L17 19l-5-3-5 3 1.4-6.2L4 9l5.6-.4L12 3Z" />
        </svg>
      );
    case 'external':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5A2.25 2.25 0 0 1 5.25 5.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25M3 18.75A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75M3 18.75V9h18v9.75" />
        </svg>
      );
  }
}

export default function EventChip({ title, sourceType, priority, timeText, filled = true, compact = true }: Props) {
  const t = useT();
  const meta = resolveTypeMeta(sourceType);
  const prio = normalizePriority(priority);
  const clean = cleanTitle(title);

  if (!filled) {
    // «Полоска» — используется для allDay-блоков в неделе/листе
    return (
      <div className="ev-chip ev-chip-thin" style={{ ['--ev-color' as any]: meta.color }}>
        <span className="ev-dot" />
        <span className="ev-title">{clean}</span>
        {prio && (
          <span className="ev-prio" title={`Приоритет: ${prio}`} style={{ background: PRIORITY_COLOR[prio] }} />
        )}
      </div>
    );
  }

  return (
    <div
      className="ev-chip ev-chip-filled"
      style={{
        ['--ev-color' as any]: meta.color,
        background: `${meta.color}22`,
        borderLeft: `3px solid ${meta.color}`,
        color: 'inherit',
      }}
    >
      <Icon name={meta.icon} className="ev-icon" />
      <span className={`ev-title ${compact ? 'ev-title-clip' : ''}`}>{clean}</span>
      {timeText && <span className="ev-time">{timeText}</span>}
      {prio && (
        <span className="ev-prio" title={`Приоритет: ${prio}`} style={{ background: PRIORITY_COLOR[prio] }} />
      )}
    </div>
  );
}
