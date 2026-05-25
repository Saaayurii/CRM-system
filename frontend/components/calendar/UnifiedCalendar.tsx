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
  const [mine, setMine] = useState<boolean>(!!onlyMine);
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 w-full max-w-9xl mx-auto">
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setEditing({ projectId }); setEditorOpen(true); }}
            className="px-3 py-1.5 text-sm rounded-md bg-violet-500 text-white hover:bg-violet-600"
          >
            + Событие
          </button>
          <a
            href="/dashboard/settings/calendar-integrations"
            className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Интеграции
          </a>
          <label className="text-sm flex items-center gap-1 text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={mine}
              onChange={(e) => setMine(e.target.checked)}
              className="rounded"
            />
            Только мои
          </label>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 flex-wrap">
        {visibleSources.map((s) => (
          <button
            key={s}
            onClick={() => toggleSource(s)}
            className={`px-2.5 py-1 text-xs rounded-full border flex items-center gap-1.5 transition ${
              sources.includes(s)
                ? 'border-transparent text-white'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
            }`}
            style={
              sources.includes(s)
                ? { backgroundColor: SOURCE_COLORS[s] || '#3b82f6' }
                : undefined
            }
            type="button"
          >
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: SOURCE_COLORS[s] || '#3b82f6' }}
            />
            {SOURCE_LABELS[s] || s}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, rrulePlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
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
          dayMaxEvents={4}
          weekNumbers={false}
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
