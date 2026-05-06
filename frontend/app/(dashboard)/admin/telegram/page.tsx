'use client';

import { useState, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

/* ─── Telegram JSON export types ─── */
interface TgMessage {
  id: number;
  type: string;
  date: string;
  from?: string;
  from_id?: string;
  text?: string | Array<{ type: string; text: string }>;
  media_type?: string;
  photo?: string;
  file?: string;
  mime_type?: string;
  duration_seconds?: number;
  forwarded_from?: string;
  reply_to_message_id?: number;
}

interface TgChat {
  id: number;
  name: string;
  type: string;
  messages: TgMessage[];
}

interface TgExport {
  chats?: { list: TgChat[] };
  messages?: TgMessage[];
  name?: string;
  type?: string;
  id?: number;
}

interface ParsedChat {
  id: number;
  name: string;
  type: string;
  messageCount: number;
  firstDate: string;
  lastDate: string;
  messages: TgMessage[];
  selected: boolean;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

/* ─── helpers ─── */
function extractText(text: TgMessage['text']): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text.map((t) => (typeof t === 'string' ? t : t.text)).join('');
}

function chatTypeLabel(type: string): string {
  const map: Record<string, string> = {
    personal_chat: 'Личный',
    bot_chat: 'Бот',
    private_group: 'Группа',
    private_supergroup: 'Супергруппа',
    private_channel: 'Канал',
    saved_messages: 'Избранное',
    public_supergroup: 'Публичная группа',
    public_channel: 'Публичный канал',
  };
  return map[type] || type;
}

function chatTypeColor(type: string): string {
  if (type === 'personal_chat') return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
  if (type.includes('channel')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  if (type === 'saved_messages') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
}

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return d; }
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

/* ─── Page ─── */
export default function TelegramImportPage() {
  const addToast = useToastStore((s) => s.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [chats, setChats] = useState<ParsedChat[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; name: string }>({ current: 0, total: 0, name: '' });
  const [importResults, setImportResults] = useState<{ name: string; channelId: number; messages: number; ok: boolean }[]>([]);
  const [search, setSearch] = useState('');
  const [expandedChat, setExpandedChat] = useState<number | null>(null);

  /* ─── parse uploaded JSON ─── */
  const parseFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      addToast('error', 'Загрузите JSON-файл экспорта Telegram Desktop');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data: TgExport = JSON.parse(e.target?.result as string);
        let chatList: TgChat[] = [];

        // Full export: { chats: { list: [...] } }
        if (data.chats?.list) {
          chatList = data.chats.list;
        }
        // Single chat export: { name, type, messages }
        else if (data.messages && data.name) {
          chatList = [{ id: data.id ?? 0, name: data.name, type: data.type ?? 'personal_chat', messages: data.messages }];
        }

        if (!chatList.length) {
          addToast('error', 'Не удалось распознать структуру файла экспорта Telegram');
          return;
        }

        const parsed: ParsedChat[] = chatList
          .filter((c) => c.messages?.length > 0)
          .map((c) => {
            const msgs = c.messages.filter((m) => m.type === 'message');
            const dates = msgs.map((m) => m.date).sort();
            return {
              id: c.id,
              name: c.name || 'Без названия',
              type: c.type || 'personal_chat',
              messageCount: msgs.length,
              firstDate: dates[0] || '',
              lastDate: dates[dates.length - 1] || '',
              messages: msgs,
              selected: true,
            };
          })
          .sort((a, b) => b.messageCount - a.messageCount);

        setChats(parsed);
        setStep('preview');
      } catch {
        addToast('error', 'Не удалось разобрать файл — проверьте формат');
      }
    };
    reader.readAsText(file, 'utf-8');
  }, [addToast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  }, [parseFile]);

  /* ─── import selected chats ─── */
  const handleImport = async () => {
    const selected = chats.filter((c) => c.selected);
    if (!selected.length) { addToast('error', 'Выберите хотя бы один чат'); return; }
    setImporting(true);
    setStep('importing');
    setImportProgress({ current: 0, total: selected.length, name: '' });
    const results: typeof importResults = [];

    for (let i = 0; i < selected.length; i++) {
      const chat = selected[i];
      setImportProgress({ current: i + 1, total: selected.length, name: chat.name });
      try {
        const payload = {
          name: chat.name,
          type: chat.type,
          telegramId: chat.id,
          messages: chat.messages.slice(0, 2000).map((m) => ({
            date: m.date,
            from: m.from || 'Неизвестно',
            fromId: m.from_id,
            text: extractText(m.text),
            mediaType: m.media_type,
            forwardedFrom: m.forwarded_from,
          })),
        };
        const { data } = await api.post('/chat-channels/import-telegram', payload);
        results.push({ name: chat.name, channelId: data.channelId || data.id, messages: chat.messages.length, ok: true });
      } catch {
        results.push({ name: chat.name, channelId: 0, messages: 0, ok: false });
      }
    }

    setImportResults(results);
    setImporting(false);
    setStep('done');
    const ok = results.filter((r) => r.ok).length;
    addToast('success', `Импортировано: ${ok} из ${selected.length} чатов`);
  };

  const selectedCount = chats.filter((c) => c.selected).length;
  const filteredChats = chats.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  /* ─── Upload step ─── */
  if (step === 'upload') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Импорт из Telegram</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Загрузите JSON-экспорт из Telegram Desktop — диалоги появятся в системе чатов CRM
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">Как получить файл экспорта:</p>
          <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
            <li>Откройте Telegram Desktop</li>
            <li>Зайдите в нужный чат или в меню <strong>☰ → Настройки → Экспорт данных Telegram</strong></li>
            <li>Выберите «Формат: JSON» и нужные чаты</li>
            <li>Нажмите «Экспорт» — получите папку с <strong>result.json</strong></li>
            <li>Загрузите этот файл сюда</li>
          </ol>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all ${
            dragging
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 scale-[1.01]'
              : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragging ? 'bg-violet-100 dark:bg-violet-800/40' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <svg className={`w-8 h-8 ${dragging ? 'text-violet-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {dragging ? 'Отпустите файл' : 'Перетащите result.json или нажмите для выбора'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Поддерживается: JSON-экспорт Telegram Desktop</p>
          </div>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
        </div>
      </div>
    );
  }

  /* ─── Importing step ─── */
  if (step === 'importing') {
    const pct = importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0;
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-20 gap-6">
        <div className="w-20 h-20 rounded-full border-4 border-violet-200 dark:border-violet-900 border-t-violet-500 animate-spin" />
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">Импортируем диалоги...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{importProgress.name}</p>
        </div>
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{importProgress.current} / {importProgress.total}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    );
  }

  /* ─── Done step ─── */
  if (step === 'done') {
    const ok = importResults.filter((r) => r.ok);
    const fail = importResults.filter((r) => !r.ok);
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Импорт завершён</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Успешно: {ok.length}, ошибок: {fail.length}</p>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          {importResults.map((r, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${r.ok ? 'border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-900/10' : 'border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${r.ok ? 'bg-green-500' : 'bg-red-500'}`}>
                {r.ok
                  ? <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  : <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${r.ok ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>{r.name}</p>
                {r.ok && <p className="text-xs text-gray-500 dark:text-gray-400">{r.messages.toLocaleString('ru')} сообщений → канал #{r.channelId}</p>}
                {!r.ok && <p className="text-xs text-red-500">Ошибка при импорте</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setStep('upload'); setChats([]); setImportResults([]); setFileName(''); }}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Загрузить ещё
          </button>
          <a href="/chat" className="px-4 py-2 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors">
            Перейти в чат →
          </a>
        </div>
      </div>
    );
  }

  /* ─── Preview step ─── */
  const totalMessages = chats.filter((c) => c.selected).reduce((s, c) => s + c.messageCount, 0);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Выберите диалоги для импорта</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Файл: <span className="font-mono text-xs">{fileName}</span> · {chats.length} чатов найдено
          </p>
        </div>
        <button
          onClick={() => { setStep('upload'); setChats([]); setFileName(''); }}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          ← Загрузить другой
        </button>
      </div>

      {/* Search + select all */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setChats((prev) => prev.map((c) => ({ ...c, selected: true })))}
          className="text-xs px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
        >
          Все
        </button>
        <button
          onClick={() => setChats((prev) => prev.map((c) => ({ ...c, selected: false })))}
          className="text-xs px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
        >
          Снять
        </button>
      </div>

      {/* Chat list */}
      <div className="space-y-2 mb-6 max-h-[52vh] overflow-y-auto pr-1">
        {filteredChats.map((chat) => {
          const isExpanded = expandedChat === chat.id;
          return (
            <div
              key={chat.id}
              className={`rounded-xl border transition-all ${
                chat.selected
                  ? 'border-violet-300 dark:border-violet-700 bg-violet-50/60 dark:bg-violet-900/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Checkbox */}
                <button
                  onClick={() => setChats((prev) => prev.map((c) => c.id === chat.id ? { ...c, selected: !c.selected } : c))}
                  className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${
                    chat.selected ? 'bg-violet-500 border-violet-500' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  }`}
                >
                  {chat.selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </button>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 ${chat.type === 'personal_chat' ? 'bg-sky-500' : chat.type === 'saved_messages' ? 'bg-amber-400' : 'bg-violet-500'}`}>
                  {chat.type === 'saved_messages'
                    ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    : getInitials(chat.name)
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{chat.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${chatTypeColor(chat.type)}`}>
                      {chatTypeLabel(chat.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    <span>{chat.messageCount.toLocaleString('ru')} сообщ.</span>
                    {chat.firstDate && <span>{formatDate(chat.firstDate)} — {formatDate(chat.lastDate)}</span>}
                  </div>
                </div>

                {/* Preview toggle */}
                <button
                  onClick={() => setExpandedChat(isExpanded ? null : chat.id)}
                  className="shrink-0 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Предпросмотр"
                >
                  <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Message preview */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2 space-y-1.5 max-h-48 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/20 rounded-b-xl">
                  {chat.messages.slice(0, 8).map((m) => {
                    const txt = extractText(m.text);
                    if (!txt && !m.media_type) return null;
                    return (
                      <div key={m.id} className="flex gap-2 text-xs">
                        <span className="shrink-0 font-medium text-gray-600 dark:text-gray-400 truncate max-w-[100px]">{m.from || 'Неизв.'}</span>
                        <span className="text-gray-500 dark:text-gray-400 truncate">
                          {m.media_type ? `[${m.media_type}] ` : ''}{txt || '—'}
                        </span>
                        <span className="shrink-0 text-gray-300 dark:text-gray-600 ml-auto">{m.date?.slice(11, 16)}</span>
                      </div>
                    );
                  })}
                  {chat.messageCount > 8 && (
                    <p className="text-xs text-gray-400 text-center pt-1">...и ещё {(chat.messageCount - 8).toLocaleString('ru')} сообщений</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer bar */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 -mx-6 px-6 py-4 flex items-center justify-between gap-4 rounded-b-xl">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Выбрано: <span className="font-semibold text-gray-800 dark:text-gray-100">{selectedCount}</span> чатов
          {selectedCount > 0 && <span className="ml-2 text-gray-400">· ~{totalMessages.toLocaleString('ru')} сообщений</span>}
        </div>
        <button
          onClick={handleImport}
          disabled={selectedCount === 0 || importing}
          className="px-5 py-2 text-sm font-medium text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Импортировать {selectedCount > 0 ? `(${selectedCount})` : ''}
        </button>
      </div>
    </div>
  );
}
