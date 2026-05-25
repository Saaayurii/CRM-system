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
import { CalendarSource, FeedEvent, SOURCE_COLORS, SOURCE_LABELS } from './types';
import EventEditorModal from './EventEditorModal';
import './calendar.css';

interface Props {
  /** Какие источники включить по умолчанию. */
  defaultSources?: CalendarSource[];
  /** Доступные пользователю для переключения источники. */
  availableSources?: CalendarSource[];
  /** Только мои события (фильтр на бэке). */
  onlyMine?: boolean;
  /** Жёсткий фильтр по проекту. */
  projectId?: number;
  /** Заголовок страницы. */
  title?: string;
  /** Подзаголовок. */
  subtitle?: string;
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

export default function UnifiedCalendar({
  defaultSources,
  availableSources = ALL_SOURCES,
  onlyMine,
  projectId,
  title = 'Календарь',
  subtitle,
}: Props) {
  const calendarRef = useRef<any>(null);
  const [sources, setSources] = useState<CalendarSource[]>(
    defaultSources?.length ? defaultSources : availableSources,
  );
  // "Только мои" — по умолчанию включено.
  const [mine, setMine] = useState<boolean>(onlyMine ?? true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const eventsSource = useCallback(
    (info: any, success: any, fail: any) => {
      const params = new URLSearchParams({
        start: info.startStr,
        end: info.endStr,
        sources: sources.join(','),
      });
      if (mine) params.set('mine', '1');
      if (projectId) params.set('projectId', String(projectId));
      api
        .get<FeedEvent[]>(`/calendar-feed?${params.toString()}`)
        .then((res) => {
          const evs = (res.data || []).map((e) => ({
            ...e,
            // FullCalendar воспринимает 'editable' напрямую
            editable: e.editable,
          }));
          success(evs);
        })
        .catch((err) => fail(err));
    },
    [sources, mine, projectId, refreshTick],
  );

  const refresh = useCallback(() => setRefreshTick((t) => t + 1), []);
  useEffect(() => {
    calendarRef.current?.getApi().refetchEvents();
  }, [sources, mine, projectId, refreshTick]);

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

  const handleEventClick = (clickInfo: any) => {
    const ev = clickInfo.event;
    const props = ev.extendedProps || {};
    // Кликабельные внешние ссылки (задача/инспекция/проект) — открываем url
    if (props.url || ev.url) {
      // FullCalendar сам обработает url, если задано в event.url
    }
    if (ev.id.startsWith('calendar:')) {
      const eventId = Number(ev.id.replace('calendar:', ''));
      setEditing({
        id: eventId,
        title: ev.title,
        description: props.description,
        location: props.location,
        startDatetime: ev.startStr,
        endDatetime: ev.endStr,
        isAllDay: ev.allDay,
        eventType: props.eventType,
        customTypeId: props.customTypeId,
        recurrenceRule: props.recurrenceRule,
        projectId,
      });
      setEditorOpen(true);
    }
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

  const visibleSources = useMemo(
    () => availableSources,
    [availableSources],
  );

  const allSelected = sources.length === visibleSources.length;
  const toggleAllSources = () => {
    setSources(allSelected ? [] : [...visibleSources]);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 w-full max-w-9xl mx-auto">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented control: scope */}
          <div className="inline-flex p-0.5 rounded-lg bg-gray-100 dark:bg-gray-700/60 text-sm">
            <button
              type="button"
              onClick={() => setMine(true)}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                mine
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
              </svg>
              Только мои
            </button>
            <button
              type="button"
              onClick={() => setMine(false)}
              className={`px-3 py-1.5 rounded-md transition ${
                !mine
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Все
            </button>
          </div>

          {/* Integrations (icon button) */}
          <a
            href="/dashboard/settings/calendar-integrations"
            title="Интеграции"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            <span className="hidden sm:inline">Интеграции</span>
          </a>

          {/* Primary CTA */}
          <button
            onClick={() => { setEditing({ projectId }); setEditorOpen(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-lg bg-violet-500 hover:bg-violet-600 text-white shadow-sm transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            Создать событие
          </button>
        </div>
      </div>

      {/* Source filter chips */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={toggleAllSources}
          className="px-2.5 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          {allSelected ? 'Скрыть все' : 'Показать все'}
        </button>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        {visibleSources.map((s) => {
          const active = sources.includes(s);
          const color = SOURCE_COLORS[s] || '#3b82f6';
          return (
            <button
              key={s}
              onClick={() => toggleSource(s)}
              type="button"
              className={`px-2.5 py-1 text-xs rounded-md border flex items-center gap-1.5 transition ${
                active
                  ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                  : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title={SOURCE_LABELS[s] || s}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full transition ${active ? '' : 'opacity-40'}`}
                style={{ backgroundColor: color }}
              />
              {SOURCE_LABELS[s] || s}
            </button>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 px-3 py-3 sm:px-4 sm:py-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, rrulePlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'title',
            center: '',
            right: 'prev,today,next dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          titleFormat={{ year: 'numeric', month: 'long' }}
          buttonText={{
            today: 'Сегодня',
            month: 'Месяц',
            week: 'Неделя',
            day: 'День',
            list: 'Лента',
          }}
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
          events={eventsSource}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventDrop}
        />
      </div>

      {editorOpen && (
        <EventEditorModal
          initial={editing}
          onClose={() => setEditorOpen(false)}
          onSaved={() => { setEditorOpen(false); refresh(); }}
          onDeleted={() => { setEditorOpen(false); refresh(); }}
        />
      )}
    </div>
  );
}
