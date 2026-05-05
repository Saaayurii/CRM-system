'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';
import { useChatStore } from '@/stores/chatStore';

// ── Types ──────────────────────────────────────────────────────────────────

type Panel = 'search' | 'task' | 'note' | 'timer' | null;

interface SearchResult {
  type: 'project' | 'task' | 'client';
  id: number;
  title: string;
  subtitle?: string;
  href: string;
}

interface Note {
  id: string;
  text: string;
  createdAt: string;
}

// ── Speed-dial items ───────────────────────────────────────────────────────

const ACTIONS = [
  { id: 'timer', label: 'Таймер', color: 'bg-amber-500 hover:bg-amber-600', icon: TimerIcon },
  { id: 'note',  label: 'Заметка', color: 'bg-emerald-500 hover:bg-emerald-600', icon: NoteIcon },
  { id: 'task',  label: 'Задача', color: 'bg-sky-500 hover:bg-sky-600', icon: TaskIcon },
  { id: 'search', label: 'Поиск', color: 'bg-violet-500 hover:bg-violet-600', icon: SearchIcon },
] as const;

// ── Main component ─────────────────────────────────────────────────────────

export default function QuickActionsButton() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const chatWindowOpen = useChatStore((s) => s.chatWindowOpen);

  // Close on outside click
  useEffect(() => {
    if (!open && !panel) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPanel(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, panel]);

  // Keyboard shortcut: Ctrl+K → search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setPanel('search');
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setPanel(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const openPanel = (id: Panel) => {
    setPanel(id);
    setOpen(false);
  };

  const closePanel = () => setPanel(null);

  if (chatWindowOpen) return null;

  return (
    <div ref={rootRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Speed-dial items */}
      {open && (
        <div className="flex flex-col items-end gap-2 mb-1">
          {ACTIONS.map((action, i) => (
            <div
              key={action.id}
              className="flex items-center gap-2"
              style={{ animation: `fabSlideIn 0.15s ease ${i * 0.04}s both` }}
            >
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 shadow px-2 py-0.5 rounded-full whitespace-nowrap">
                {action.label}
              </span>
              <button
                onClick={() => openPanel(action.id as Panel)}
                className={`w-10 h-10 rounded-full text-white shadow-lg transition-all ${action.color}`}
                title={action.label}
              >
                <action.icon />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { setOpen((v) => !v); setPanel(null); }}
        className={`w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-xl flex items-center justify-center transition-all duration-200 ${open ? 'rotate-45' : ''}`}
        title="Быстрые действия"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Panels */}
      {panel === 'search' && <SearchPanel onClose={closePanel} />}
      {panel === 'task'   && <QuickTaskPanel onClose={closePanel} />}
      {panel === 'note'   && <NotePanel onClose={closePanel} />}
      {panel === 'timer'  && <TimerPanel onClose={closePanel} />}

      <style>{`
        @keyframes fabSlideIn {
          from { opacity: 0; transform: translateY(8px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Search panel ───────────────────────────────────────────────────────────

function SearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const q = encodeURIComponent(query.trim());
        const [pr, tk, cl] = await Promise.allSettled([
          api.get(`/projects?search=${q}&limit=4`),
          api.get(`/tasks?search=${q}&limit=4`),
          api.get(`/clients?search=${q}&limit=4`),
        ]);

        const items: SearchResult[] = [];

        if (pr.status === 'fulfilled') {
          const list = Array.isArray(pr.value.data) ? pr.value.data
            : (pr.value.data?.data ?? pr.value.data?.projects ?? []);
          list.slice(0, 4).forEach((p: any) => items.push({
            type: 'project', id: p.id,
            title: p.name || p.title,
            subtitle: p.status ?? '',
            href: `/dashboard/projects/${p.id}`,
          }));
        }
        if (tk.status === 'fulfilled') {
          const list = Array.isArray(tk.value.data) ? tk.value.data
            : (tk.value.data?.data ?? tk.value.data?.tasks ?? []);
          list.slice(0, 4).forEach((t: any) => items.push({
            type: 'task', id: t.id,
            title: t.title,
            subtitle: t.projectName ?? '',
            href: `/dashboard/tasks?edit=${t.id}`,
          }));
        }
        if (cl.status === 'fulfilled') {
          const list = Array.isArray(cl.value.data) ? cl.value.data
            : (cl.value.data?.data ?? cl.value.data?.clients ?? []);
          list.slice(0, 4).forEach((c: any) => items.push({
            type: 'client', id: c.id,
            title: c.name || c.companyName,
            subtitle: c.email ?? '',
            href: `/dashboard/clients`,
          }));
        }

        setResults(items);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const go = (href: string) => { router.push(href); onClose(); };

  const TYPE_ICONS: Record<string, React.ReactNode> = {
    project: <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded">ПР</span>,
    task:    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/40 px-1.5 py-0.5 rounded">ЗД</span>,
    client:  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">КЛ</span>,
  };

  return (
    <PanelShell onClose={onClose} className="w-96">
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-3 py-2">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск проектов, задач, клиентов…"
          className="flex-1 bg-transparent text-sm outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
        />
        <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded shrink-0">Esc</span>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {loading && (
          <div className="py-4 text-center text-sm text-gray-400">Поиск…</div>
        )}
        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="py-4 text-center text-sm text-gray-400">Ничего не найдено</div>
        )}
        {!loading && query.length < 2 && (
          <div className="py-4 text-center text-xs text-gray-400">Введите минимум 2 символа</div>
        )}
        {results.map((r) => (
          <button
            key={`${r.type}-${r.id}`}
            onClick={() => go(r.href)}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left transition-colors"
          >
            {TYPE_ICONS[r.type]}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{r.title}</p>
              {r.subtitle && <p className="text-xs text-gray-400 truncate">{r.subtitle}</p>}
            </div>
          </button>
        ))}
      </div>
    </PanelShell>
  );
}

// ── Quick Task panel ───────────────────────────────────────────────────────

const PRIORITY_OPTS = [
  { value: 1, label: 'Низкий', color: 'text-green-600' },
  { value: 2, label: 'Средний', color: 'text-sky-600' },
  { value: 3, label: 'Высокий', color: 'text-orange-600' },
  { value: 4, label: 'Критический', color: 'text-red-600' },
];

function QuickTaskPanel({ onClose }: { onClose: () => void }) {
  const addToast = useToastStore((s) => s.addToast);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState(2);
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    api.get('/projects?limit=50').then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data?.data ?? r.data?.projects ?? []);
      setProjects(list.map((p: any) => ({ id: p.id, name: p.name || p.title })));
    }).catch(() => {});
  }, []);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.post('/tasks', {
        title: title.trim(),
        priority,
        status: 0,
        ...(projectId ? { projectId: Number(projectId) } : {}),
        ...(dueDate ? { dueDate } : {}),
      });
      addToast('success', 'Задача создана');
      onClose();
    } catch {
      addToast('error', 'Ошибка создания задачи');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PanelShell onClose={onClose} className="w-80">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Быстрая задача</h3>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Название задачи…"
          className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-colors"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="text-sm px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-colors"
          >
            {PRIORITY_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-sm px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-colors"
          />
        </div>
        {projects.length > 0 && (
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : '')}
            className="text-sm px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none focus:border-violet-400 dark:focus:border-violet-500 transition-colors"
          >
            <option value="">Без проекта</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <button
          onClick={submit}
          disabled={!title.trim() || saving}
          className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {saving ? 'Создание…' : 'Создать задачу'}
        </button>
      </div>
    </PanelShell>
  );
}

// ── Note panel ─────────────────────────────────────────────────────────────

const NOTES_KEY = 'crm_quick_notes';

function NotePanel({ onClose }: { onClose: () => void }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      if (raw) setNotes(JSON.parse(raw));
    } catch {}
    textareaRef.current?.focus();
  }, []);

  const save = (updated: Note[]) => {
    setNotes(updated);
    localStorage.setItem(NOTES_KEY, JSON.stringify(updated));
  };

  const addNote = () => {
    if (!text.trim()) return;
    const note: Note = { id: crypto.randomUUID(), text: text.trim(), createdAt: new Date().toISOString() };
    save([note, ...notes]);
    setText('');
  };

  const deleteNote = (id: string) => save(notes.filter((n) => n.id !== id));

  return (
    <PanelShell onClose={onClose} className="w-80">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Заметки</h3>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote(); }}
            placeholder="Быстрая заметка… (Ctrl+Enter)"
            rows={2}
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:border-emerald-400 dark:focus:border-emerald-500 resize-none transition-colors"
          />
          <button
            onClick={addNote}
            disabled={!text.trim()}
            className="px-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-sm font-medium transition-colors"
          >
            +
          </button>
        </div>
        <div className="max-h-60 overflow-y-auto flex flex-col gap-1.5 mt-1">
          {notes.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-3">Заметок пока нет</p>
          )}
          {notes.map((n) => (
            <div key={n.id} className="group flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/40 rounded-lg px-3 py-2">
              <p className="flex-1 text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words">{n.text}</p>
              <button
                onClick={() => deleteNote(n.id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}

// ── Timer panel ────────────────────────────────────────────────────────────

function TimerPanel({ onClose }: { onClose: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [label, setLabel] = useState('');
  const [laps, setLaps] = useState<{ label: string; time: number }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const reset = () => { setRunning(false); setSeconds(0); setLaps([]); };
  const lap = () => { setLaps((l) => [...l, { label: label.trim() || `Отсечка ${l.length + 1}`, time: seconds }]); };

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <PanelShell onClose={onClose} className="w-72">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Таймер работы</h3>
      </div>
      <div className="p-4 flex flex-col items-center gap-4">
        {/* Clock face */}
        <div className={`text-5xl font-mono font-bold tracking-tight tabular-nums ${running ? 'text-amber-500' : 'text-gray-800 dark:text-gray-100'}`}>
          {fmt(seconds)}
        </div>

        {/* Label input */}
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Чем занимаетесь?"
          className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:border-amber-400 dark:focus:border-amber-500 text-center transition-colors"
        />

        {/* Controls */}
        <div className="flex gap-2 w-full">
          <button
            onClick={() => setRunning((v) => !v)}
            className={`flex-1 py-2 rounded-lg text-white text-sm font-medium transition-colors ${
              running ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {running ? 'Пауза' : seconds > 0 ? 'Продолжить' : 'Старт'}
          </button>
          {seconds > 0 && running && (
            <button
              onClick={lap}
              className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors"
            >
              Отсечка
            </button>
          )}
          {seconds > 0 && !running && (
            <button
              onClick={reset}
              className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors"
            >
              Сброс
            </button>
          )}
        </div>

        {/* Laps */}
        {laps.length > 0 && (
          <div className="w-full max-h-32 overflow-y-auto flex flex-col gap-1">
            {laps.map((lap, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                <span className="truncate">{lap.label}</span>
                <span className="font-mono ml-2 shrink-0">{fmt(lap.time)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  );
}

// ── Shared panel shell ─────────────────────────────────────────────────────

function PanelShell({ children, onClose, className = '' }: { children: React.ReactNode; onClose: () => void; className?: string }) {
  return (
    <div
      className={`absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
      style={{ animation: 'fabPanelIn 0.18s ease both' }}
    >
      {children}
      <style>{`
        @keyframes fabPanelIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
