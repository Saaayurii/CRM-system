'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import rrulePlugin from '@fullcalendar/rrule';
import ruLocale from '@fullcalendar/core/locales/ru';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import {
  CalendarSource,
  CalendarViewMode,
  FeedEvent,
  isOverdueEvent,
  isoDateKey,
} from './types';
import EventEditorModal from './EventEditorModal';
import EventChip from './EventChip';
import EventPopover from './EventPopover';
import FiltersDrawer from './FiltersDrawer';
import TimelineView from './TimelineView';
import './calendar.css';

interface Props {
  defaultSources?: CalendarSource[];
  availableSources?: CalendarSource[];
  onlyMine?: boolean;
  projectId?: number;
  title?: string;
  subtitle?: string;
  /** Какой вид открывать по умолчанию. По мокапу — Неделя. */
  defaultView?: CalendarViewMode;
}

const ALL_SOURCES: CalendarSource[] = [
  'calendar',
  'tasks',
  'inspections',
  'timeoff',
  'attendance',
  'projects',
  'external',
];

const FC_VIEW: Record<Exclude<CalendarViewMode, 'timeline'>, string> = {
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  day: 'timeGridDay',
};

function formatTitle(date: Date, view: CalendarViewMode): string {
  if (view === 'day') {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (view === 'week' || view === 'timeline') {
    return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  }
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export default function UnifiedCalendar({
  defaultSources,
  availableSources = ALL_SOURCES,
  onlyMine,
  projectId,
  title = 'Календарь',
  subtitle,
  defaultView = 'week',
}: Props) {
  const calendarRef = useRef<any>(null);
  const user = useAuthStore((s) => s.user);
  const roleCode = user?.role?.code;
  const isAdminLike =
    roleCode === 'super_admin' || roleCode === 'admin' || user?.isGlobalAdmin;

  const [view, setView] = useState<CalendarViewMode>(defaultView);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [sources, setSources] = useState<CalendarSource[]>(
    defaultSources?.length ? defaultSources : availableSources,
  );
  const [mine, setMine] = useState<boolean>(
    onlyMine !== undefined ? onlyMine : !!user && !isAdminLike,
  );
  const [mineTouched, setMineTouched] = useState(false);
  useEffect(() => {
    if (onlyMine !== undefined || mineTouched || !user) return;
    setMine(!isAdminLike);
  }, [user, isAdminLike, onlyMine, mineTouched]);
  const setMineAndTouch = (v: boolean) => {
    setMineTouched(true);
    setMine(v);
  };

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Все события текущего видимого диапазона — для density-индикаторов и Timeline.
  const [allEvents, setAllEvents] = useState<FeedEvent[]>([]);
  const [viewRange, setViewRange] = useState<{ start: Date; end: Date } | null>(null);

  // Popover preview
  const [popover, setPopover] = useState<{ event: FeedEvent; rect: DOMRect } | null>(null);

  // Maps for Timeline row labels
  const [userNameById, setUserNameById] = useState<Record<number, string>>({});
  const [projectNameById, setProjectNameById] = useState<Record<number, string>>({});

  // Загружаем имена для таймлайна один раз при первом входе на view=timeline
  useEffect(() => {
    if (view !== 'timeline') return;
    let cancelled = false;
    (async () => {
      try {
        const [usersRes, projectsRes] = await Promise.all([
          api.get('/users?limit=500').catch(() => null),
          api.get('/projects?limit=500').catch(() => null),
        ]);
        if (cancelled) return;
        const uMap: Record<number, string> = {};
        const users = usersRes?.data?.users ?? usersRes?.data?.data ?? usersRes?.data ?? [];
        if (Array.isArray(users)) {
          for (const u of users) {
            const id = u.id ?? u.userId;
            if (!id) continue;
            const name = [u.lastName ?? u.last_name, u.firstName ?? u.first_name]
              .filter(Boolean)
              .join(' ') || u.email || `#${id}`;
            uMap[id] = name;
          }
        }
        setUserNameById(uMap);

        const pMap: Record<number, string> = {};
        const projects = projectsRes?.data?.projects ?? projectsRes?.data?.data ?? projectsRes?.data ?? [];
        if (Array.isArray(projects)) {
          for (const p of projects) {
            if (!p.id) continue;
            pMap[p.id] = p.name || `Проект #${p.id}`;
          }
        }
        setProjectNameById(pMap);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view]);

  const fetchEvents = useCallback(
    async (startISO: string, endISO: string): Promise<FeedEvent[]> => {
      const params = new URLSearchParams({
        start: startISO,
        end: endISO,
        sources: sources.join(','),
      });
      if (mine) params.set('mine', '1');
      if (projectId) params.set('projectId', String(projectId));
      const res = await api.get<FeedEvent[]>(`/calendar-feed?${params.toString()}`);
      return res.data || [];
    },
    [sources, mine, projectId],
  );

  // FullCalendar events callback
  const eventsSource = useCallback(
    (info: any, success: any, fail: any) => {
      fetchEvents(info.startStr, info.endStr)
        .then((evs) => {
          setLoadError(null);
          setAllEvents(evs);
          setViewRange({ start: new Date(info.startStr), end: new Date(info.endStr) });
          success(
            evs.map((e) => ({
              ...e,
              editable: e.editable,
            })),
          );
        })
        .catch((err) => {
          const msg =
            err?.response?.data?.message || err?.message || 'Ошибка загрузки событий';
          setLoadError(typeof msg === 'string' ? msg : JSON.stringify(msg));
          fail(err);
        });
    },
    [fetchEvents, refreshTick],
  );

  // В timeline-режиме FullCalendar не подключен — грузим события сами.
  useEffect(() => {
    if (view !== 'timeline') return;
    // Период: текущий месяц
    const start = new Date(currentDate);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    setViewRange({ start, end });
    fetchEvents(start.toISOString(), end.toISOString())
      .then((evs) => {
        setLoadError(null);
        setAllEvents(evs);
      })
      .catch((err) => {
        setLoadError(err?.response?.data?.message || err?.message || 'Ошибка загрузки');
      });
  }, [view, currentDate, fetchEvents, refreshTick]);

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  useEffect(() => {
    if (view === 'timeline') return;
    calendarRef.current?.getApi().refetchEvents();
  }, [sources, mine, projectId, refreshTick, view]);

  // Синхронизация view <-> FullCalendar
  useEffect(() => {
    if (view === 'timeline') return;
    const api = calendarRef.current?.getApi();
    if (api) api.changeView(FC_VIEW[view]);
  }, [view]);

  // Density map: date -> { count, overdue }
  const densityByDay = useMemo(() => {
    const map: Record<string, { count: number; overdue: number }> = {};
    const now = new Date();
    for (const ev of allEvents) {
      const key = isoDateKey(ev.start);
      if (!map[key]) map[key] = { count: 0, overdue: 0 };
      map[key].count += 1;
      if (isOverdueEvent(ev, now)) map[key].overdue += 1;
    }
    return map;
  }, [allEvents]);

  const toggleSource = (s: CalendarSource) => {
    setSources((curr) =>
      curr.includes(s) ? curr.filter((x) => x !== s) : [...curr, s],
    );
  };

  const handleDateSelect = (selectInfo: any) => {
    setEditing({
      startDatetime: selectInfo.startStr,
      endDatetime: selectInfo.endStr,
      isAllDay: selectInfo.allDay,
      projectId,
    });
    setEditorOpen(true);
  };

  // Клик по событию → popover вместо немедленного открытия редактора
  const handleEventClick = (clickInfo: any) => {
    clickInfo.jsEvent?.preventDefault?.();
    const fcEvent = clickInfo.event;
    const ev: FeedEvent = {
      id: fcEvent.id,
      title: fcEvent.title,
      start: fcEvent.startStr,
      end: fcEvent.endStr,
      allDay: fcEvent.allDay,
      color: (fcEvent as any).backgroundColor,
      sourceType: fcEvent.extendedProps?.sourceType || inferSourceType(fcEvent.id),
      sourceId: fcEvent.extendedProps?.sourceId,
      projectId: fcEvent.extendedProps?.projectId,
      taskId: fcEvent.extendedProps?.taskId,
      userId: fcEvent.extendedProps?.userId,
      status: fcEvent.extendedProps?.status,
      url: (fcEvent as any).url || fcEvent.extendedProps?.url,
      editable: fcEvent.startEditable || (fcEvent as any).editable,
      extendedProps: fcEvent.extendedProps,
    };
    const rect = (clickInfo.el as HTMLElement)?.getBoundingClientRect();
    setPopover({ event: ev, rect });
  };

  const openEditorFromPopover = () => {
    if (!popover) return;
    const ev = popover.event;
    if (!ev.id.startsWith('calendar:')) {
      setPopover(null);
      return;
    }
    const eventId = Number(ev.id.replace('calendar:', ''));
    setEditing({
      id: eventId,
      title: ev.title,
      description: ev.extendedProps?.description,
      location: ev.extendedProps?.location,
      startDatetime: ev.start,
      endDatetime: ev.end,
      isAllDay: ev.allDay,
      eventType: ev.extendedProps?.eventType,
      customTypeId: ev.extendedProps?.customTypeId,
      recurrenceRule: ev.extendedProps?.recurrenceRule,
      projectId,
    });
    setPopover(null);
    setEditorOpen(true);
  };

  const handleEventDrop = async (changeInfo: any) => {
    const ev = changeInfo.event;
    if (!ev.id.startsWith('calendar:')) {
      changeInfo.revert();
      return;
    }
    const id = Number(ev.id.replace('calendar:', ''));
    try {
      await api.put(`/calendar-events/${id}`, {
        startDatetime: ev.startStr,
        endDatetime: ev.endStr || null,
        isAllDay: ev.allDay,
      });
    } catch (e) {
      changeInfo.revert();
    }
  };

  const goPrev = () => {
    if (view === 'timeline') {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() - 1);
      setCurrentDate(d);
    } else {
      calendarRef.current?.getApi().prev();
    }
  };
  const goNext = () => {
    if (view === 'timeline') {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() + 1);
      setCurrentDate(d);
    } else {
      calendarRef.current?.getApi().next();
    }
  };
  const goToday = () => {
    if (view === 'timeline') {
      setCurrentDate(new Date());
    } else {
      calendarRef.current?.getApi().today();
    }
  };

  // Force FullCalendar to remeasure all-day row heights after React renders custom chips.
  // Without this, getBoundingClientRect() returns 0 before React paints EventChip,
  // causing all events to collapse to top:0 and overlap each other.
  useEffect(() => {
    if (view === 'timeline') return;
    const timer = setTimeout(() => {
      calendarRef.current?.getApi()?.updateSize();
    }, 0);
    return () => clearTimeout(timer);
  }, [allEvents, view]);

  // FullCalendar — компактное представление события
  const renderEventContent = (arg: any) => {
    const ev = arg.event;
    const sourceType = ev.extendedProps?.sourceType || inferSourceType(ev.id);
    const priority = ev.extendedProps?.priority;
    return (
      <EventChip
        title={ev.title}
        sourceType={sourceType}
        priority={priority}
        timeText={arg.timeText && !ev.allDay ? arg.timeText : undefined}
        filled={!ev.allDay}
        compact
      />
    );
  };

  // Кастомное содержимое дня (только в режиме «Месяц»): число + индикаторы нагрузки
  const renderDayCellContent = (arg: any) => {
    const key = isoDateKey(arg.date);
    const d = densityByDay[key];
    return (
      <div className="day-cell-inner">
        <span className="day-cell-date">{arg.dayNumberText}</span>
        {d && (
          <span className="day-cell-indicators" aria-label={`${d.count} событий${d.overdue ? `, ${d.overdue} просрочено` : ''}`}>
            <span className={`day-load day-load-${loadLevel(d.count)}`} />
            {d.overdue > 0 && <span className="day-overdue" title={`${d.overdue} просроченных`} />}
          </span>
        )}
      </div>
    );
  };

  const periodTitle = formatTitle(currentDate, view);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 w-full max-w-9xl mx-auto">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
      </div>

      {/* Top bar — упрощённая навигация */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={goToday}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          Сегодня
        </button>
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            type="button"
            onClick={goPrev}
            className="px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            aria-label="Назад"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goNext}
            className="px-2.5 py-1.5 text-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-l border-gray-200 dark:border-gray-700"
            aria-label="Вперёд"
          >
            ›
          </button>
        </div>
        <div className="px-2 text-base font-semibold text-gray-800 dark:text-gray-100 capitalize">
          {periodTitle}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => {
            setEditing({ projectId });
            setEditorOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-violet-500 hover:bg-violet-600 text-white shadow-sm transition"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          Создать событие
        </button>

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5M6.75 12h10.5M10.5 18.75h3" />
          </svg>
          Фильтры
        </button>

        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
          {(['month', 'week', 'day', 'timeline'] as CalendarViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 transition ${
                view === v
                  ? 'bg-violet-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-l border-gray-200 dark:border-gray-700 first:border-l-0'
              }`}
            >
              {v === 'month' ? 'Месяц' : v === 'week' ? 'Неделя' : v === 'day' ? 'День' : 'Таймлайн'}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="mb-3 px-3 py-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-300">
          Не удалось загрузить события: {loadError}
        </div>
      )}

      {/* Main view */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 px-3 py-3 sm:px-4 sm:py-4">
        {view === 'timeline' && viewRange ? (
          <TimelineView
            rangeStart={viewRange.start}
            rangeEnd={viewRange.end}
            events={allEvents}
            userNameById={userNameById}
            projectNameById={projectNameById}
            onEventClick={(ev, rect) => setPopover({ event: ev, rect })}
          />
        ) : (
          <div className={view === 'week' ? 'cal-mobile-scroll' : ''}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, rrulePlugin]}
            initialView={FC_VIEW[view as Exclude<CalendarViewMode, 'timeline'>] || 'timeGridWeek'}
            headerToolbar={false}
            locale={ruLocale}
            firstDay={1}
            height="78vh"
            nowIndicator
            selectable
            editable
            eventResizableFromStart
            dayMaxEvents={3}
            weekNumbers={false}
            fixedWeekCount={false}
            allDaySlot
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:30:00"
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            events={eventsSource}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventDrop}
            eventContent={renderEventContent}
            dayCellContent={renderDayCellContent}
            datesSet={(arg: any) => setCurrentDate(arg.view.currentStart)}
          />
          </div>
        )}
      </div>

      {popover && (
        <EventPopover
          event={popover.event}
          anchorRect={popover.rect}
          onClose={() => setPopover(null)}
          onOpenEditor={openEditorFromPopover}
        />
      )}

      <FiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        availableSources={availableSources}
        activeSources={sources}
        toggleSource={toggleSource}
        setAllSources={setSources}
        mine={mine}
        setMine={setMineAndTouch}
      />

      {editorOpen && (
        <EventEditorModal
          initial={editing}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            setEditorOpen(false);
            refresh();
          }}
          onDeleted={() => {
            setEditorOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function loadLevel(n: number): 'low' | 'mid' | 'high' {
  if (n <= 2) return 'low';
  if (n <= 5) return 'mid';
  return 'high';
}

function inferSourceType(id: string): string {
  // id: "calendar:42" | "task:7" | "inspection:3" | "timeoff:1" | ...
  const prefix = id.split(':')[0];
  if (prefix === 'calendar') return 'manual';
  if (prefix === 'task') return 'task';
  if (prefix === 'inspection') return 'inspection';
  if (prefix === 'timeoff') return 'time_off';
  if (prefix === 'attendance') return 'attendance';
  if (prefix === 'project-start' || prefix === 'project-end') return 'project';
  return 'manual';
}
