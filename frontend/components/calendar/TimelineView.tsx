'use client';

import { useMemo } from 'react';
import { FeedEvent, cleanTitle, isoDateKey, resolveTypeMeta } from './types';

interface Props {
  rangeStart: Date;
  rangeEnd: Date;
  events: FeedEvent[];
  userNameById?: Record<number, string>;
  projectNameById?: Record<number, string>;
  onEventClick?: (ev: FeedEvent, rect: DOMRect) => void;
}

type RowKind = 'user' | 'project' | 'company';

interface Row {
  key: string;
  kind: RowKind;
  label: string;
  initials?: string;
  events: FeedEvent[];
}

const DAY_WIDTH = 110;

function diffDays(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.round(ms / (24 * 3600 * 1000));
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function shortInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('ru-RU', { day: '2-digit' });
}
function dowLabel(d: Date): string {
  return d.toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '');
}

export default function TimelineView({
  rangeStart,
  rangeEnd,
  events,
  userNameById = {},
  projectNameById = {},
  onEventClick,
}: Props) {
  const startDay = useMemo(() => startOfDay(rangeStart), [rangeStart]);
  const endDay = useMemo(() => startOfDay(rangeEnd), [rangeEnd]);
  const days = useMemo(() => {
    const result: Date[] = [];
    const total = Math.max(1, diffDays(startDay, endDay));
    for (let i = 0; i < total; i++) {
      const d = new Date(startDay);
      d.setDate(d.getDate() + i);
      result.push(d);
    }
    return result;
  }, [startDay, endDay]);

  const rows: Row[] = useMemo(() => {
    const userRows: Record<number, Row> = {};
    const projectRows: Record<number, Row> = {};
    const company: Row = { key: 'company', kind: 'company', label: 'Компания', events: [] };

    for (const ev of events) {
      if (ev.userId) {
        const k = ev.userId;
        if (!userRows[k]) {
          const name = userNameById[k] || `Сотрудник #${k}`;
          userRows[k] = {
            key: `user:${k}`,
            kind: 'user',
            label: name,
            initials: shortInitials(name),
            events: [],
          };
        }
        userRows[k].events.push(ev);
      } else if (ev.projectId) {
        const k = ev.projectId;
        if (!projectRows[k]) {
          const name = projectNameById[k] || `Проект #${k}`;
          projectRows[k] = { key: `project:${k}`, kind: 'project', label: name, events: [] };
        }
        projectRows[k].events.push(ev);
      } else {
        company.events.push(ev);
      }
    }
    const list: Row[] = [
      ...Object.values(userRows).sort((a, b) => a.label.localeCompare(b.label)),
      ...Object.values(projectRows).sort((a, b) => a.label.localeCompare(b.label)),
    ];
    if (company.events.length) list.push(company);
    return list;
  }, [events, userNameById, projectNameById]);

  const today = startOfDay(new Date());
  const todayOffset = (() => {
    const i = diffDays(startDay, today);
    if (i < 0 || i >= days.length) return null;
    return i * DAY_WIDTH + DAY_WIDTH / 2;
  })();

  const renderBar = (ev: FeedEvent) => {
    const s = startOfDay(new Date(ev.start));
    const e = startOfDay(new Date(ev.end || ev.start));
    const startIdx = Math.max(0, diffDays(startDay, s));
    const endIdx = Math.min(days.length - 1, diffDays(startDay, e));
    if (endIdx < 0 || startIdx >= days.length) return null;
    const left = startIdx * DAY_WIDTH + 6;
    const width = (endIdx - startIdx + 1) * DAY_WIDTH - 12;
    const meta = resolveTypeMeta(ev.sourceType);
    return (
      <button
        key={ev.id}
        type="button"
        className="tl-bar"
        onClick={(e) => onEventClick?.(ev, (e.currentTarget as HTMLElement).getBoundingClientRect())}
        style={{
          left: `${left}px`,
          width: `${Math.max(28, width)}px`,
          background: `${meta.color}26`,
          borderLeft: `3px solid ${meta.color}`,
          color: 'inherit',
        }}
        title={cleanTitle(ev.title)}
      >
        <span className="tl-bar-title">{cleanTitle(ev.title)}</span>
      </button>
    );
  };

  return (
    <div className="tl-wrap">
      <div className="tl-scroll">
        {/* Header */}
        <div className="tl-grid" style={{ gridTemplateColumns: `220px repeat(${days.length}, ${DAY_WIDTH}px)` }}>
          <div className="tl-corner">
            <div className="tl-corner-title">Сотрудники / Проекты</div>
            <div className="tl-corner-sub">
              {startDay.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          {days.map((d, i) => {
            const isToday = isoDateKey(d) === isoDateKey(today);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div
                key={i}
                className={`tl-day ${isToday ? 'is-today' : ''} ${isWeekend ? 'is-weekend' : ''}`}
              >
                <div className="tl-day-num">{dayLabel(d)}</div>
                <div className="tl-day-dow">{dowLabel(d)}</div>
              </div>
            );
          })}
        </div>

        {/* Rows */}
        <div className="tl-body" style={{ position: 'relative' }}>
          {todayOffset !== null && (
            <div
              className="tl-today-line"
              style={{ left: `${220 + todayOffset}px` }}
              aria-hidden
            />
          )}
          {rows.length === 0 && (
            <div className="tl-empty">Нет событий в выбранном периоде</div>
          )}
          {rows.map((row) => (
            <div
              key={row.key}
              className="tl-row tl-grid"
              style={{ gridTemplateColumns: `220px repeat(${days.length}, ${DAY_WIDTH}px)` }}
            >
              <div className={`tl-rowhead tl-rowhead-${row.kind}`}>
                {row.kind === 'user' ? (
                  <span className="tl-avatar">{row.initials || '?'}</span>
                ) : (
                  <span className="tl-folder">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75A2.25 2.25 0 0 1 4.5 4.5h4.378a2.25 2.25 0 0 1 1.591.659l1.122 1.122a2.25 2.25 0 0 0 1.591.659H19.5A2.25 2.25 0 0 1 21.75 9v9a2.25 2.25 0 0 1-2.25 2.25h-15A2.25 2.25 0 0 1 2.25 18V6.75Z" />
                    </svg>
                  </span>
                )}
                <span className="tl-rowhead-label" title={row.label}>{row.label}</span>
              </div>
              {days.map((d, i) => {
                const isToday = isoDateKey(d) === isoDateKey(today);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={`tl-cell ${isToday ? 'is-today' : ''} ${isWeekend ? 'is-weekend' : ''}`}
                  />
                );
              })}
              <div className="tl-bars-layer" style={{ left: '220px' }}>
                {row.events.map(renderBar)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
