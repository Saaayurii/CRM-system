'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';

interface CalendarEvent {
  id: number;
  title: string;
  startDatetime: string;
  endDatetime?: string;
  eventType?: string;
  status?: string;
}

interface TaskEvent {
  id: number;
  title: string;
  dueDate?: string;
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
  }
  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  // Next month padding
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
  }

  return days;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarWidget() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>(dateKey(today));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<TaskEvent[]>([]);

  useEffect(() => {
    const startDate = new Date(currentYear, currentMonth, 1).toISOString();
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

    const fetchData = async () => {
      const [evRes, taskRes] = await Promise.allSettled([
        api.get('/calendar-events', { params: { startDate, endDate, limit: 100 } }),
        api.get('/tasks', { params: { limit: 100 } }),
      ]);
      if (evRes.status === 'fulfilled') {
        setEvents(evRes.value.data.data || []);
      }
      if (taskRes.status === 'fulfilled') {
        const taskData = taskRes.value.data.data || taskRes.value.data.tasks || [];
        setTasks(taskData);
      }
    };
    fetchData();
  }, [currentMonth, currentYear]);

  const days = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);

  // Build a set of dates that have events
  const eventDates = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      const d = new Date(e.startDatetime);
      set.add(dateKey(d));
    });
    tasks.forEach((t) => {
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        set.add(dateKey(d));
      }
    });
    return set;
  }, [events, tasks]);

  // Events for selected date
  const selectedEvents = useMemo(() => {
    const calEv = events.filter((e) => dateKey(new Date(e.startDatetime)) === selectedDate);
    const taskEv = tasks
      .filter((t) => t.dueDate && dateKey(new Date(t.dueDate)) === selectedDate)
      .map((t) => ({ id: t.id, title: t.title, type: 'task' as const }));
    return [
      ...calEv.map((e) => ({ id: e.id, title: e.title, type: (e.eventType || 'event') as string })),
      ...taskEv,
    ];
  }, [events, tasks, selectedDate]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const todayKey = dateKey(today);

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {MONTHS[currentMonth]} {currentYear}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map(({ date, isCurrentMonth }, i) => {
          const key = dateKey(date);
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          const hasEvent = eventDates.has(key);

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(key)}
              className={`relative py-1.5 text-sm rounded-lg transition-colors ${
                !isCurrentMonth
                  ? 'text-gray-300 dark:text-gray-600'
                  : isSelected
                    ? 'bg-violet-500 text-white font-semibold'
                    : isToday
                      ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              {date.getDate()}
              {hasEvent && isCurrentMonth && (
                <span
                  className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-violet-500'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      <div className="mt-4 border-t border-gray-200 dark:border-gray-700/60 pt-3">
        <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
          События на {selectedDate.split('-').reverse().join('.')}
        </h4>
        {selectedEvents.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">Нет событий</p>
        ) : (
          <ul className="space-y-1.5">
            {selectedEvents.map((e) => (
              <li key={`${e.type}-${e.id}`} className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    e.type === 'task' ? 'bg-green-500' : 'bg-violet-500'
                  }`}
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{e.title}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto shrink-0">
                  {e.type === 'task' ? 'Задача' : e.type}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
