'use client';

import { useRef, useState } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { useToastStore } from '@/stores/toastStore';
import api from '@/lib/api';
import {
  ACCENTS,
  CHAT_FONT_SIZE_MAX,
  CHAT_FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  START_PAGES,
  THEME_PRESETS,
  WALLPAPERS,
  getChatBackground,
  type NightMode,
  type ThemeMode,
} from '@/lib/appearance';

/** Сжатие картинки-обоев перед загрузкой (макс. 1920px, JPEG) */
async function compressWallpaper(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const max = 1920;
      if (width > max || height > max) {
        if (width > height) {
          height = Math.round((height * max) / width);
          width = max;
        } else {
          width = Math.round((width * max) / height);
          height = max;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/* ── Переключатель (toggle) в стиле Telegram ── */
function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

/* ── Мини-карточка темы-пресета (рисованное превью, как в Telegram) ── */
function PresetCard({
  id,
  name,
  active,
  onSelect,
}: {
  id: ThemeMode;
  name: string;
  active: boolean;
  onSelect: () => void;
}) {
  const renderMock = (variant: 'classic' | 'day' | 'night') => {
    const bg =
      variant === 'classic' ? '#dcead0' : variant === 'day' ? '#f1f5f9' : '#1e202c';
    const inBubble = variant === 'night' ? '#31323e' : '#ffffff';
    const outBubble =
      variant === 'classic' ? '#a8d18d' : variant === 'day' ? '#7bc8ff' : '#3193da';
    return (
      <div className="w-full h-full flex flex-col justify-center gap-1.5 px-2" style={{ background: bg }}>
        <div className="h-3 w-2/3 rounded-md self-start" style={{ background: inBubble }} />
        <div className="h-3 w-1/2 rounded-md self-end" style={{ background: outBubble }} />
      </div>
    );
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col items-center gap-1.5 group"
    >
      <div
        className={`w-[88px] h-[60px] rounded-xl overflow-hidden border-2 transition-colors ${
          active
            ? 'border-violet-500'
            : 'border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600'
        }`}
      >
        {id === 'system' ? (
          <div className="w-full h-full flex">
            <div className="w-1/2 h-full">{renderMock('day')}</div>
            <div className="w-1/2 h-full">{renderMock('night')}</div>
          </div>
        ) : (
          renderMock(id as 'classic' | 'day' | 'night')
        )}
      </div>
      <span
        className={`text-xs font-medium ${
          active ? 'text-violet-500' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {name}
      </span>
    </button>
  );
}

/* ── Живое превью чата ── */
function ChatPreview() {
  const theme = useThemeStore((s) => s.theme);
  const { chatWallpaper, customWallpaperUrl, chatPattern, chatBubbles, nameColors, chatFontSize } =
    useThemeStore((s) => s.appearance);
  const wallpaper = getChatBackground(
    { chatWallpaper, customWallpaperUrl, chatPattern },
    theme,
  );
  const ts = { fontSize: `${chatFontSize}px`, lineHeight: 1.4 };

  const incomingName = (
    <p
      className={`text-xs font-semibold mb-0.5 ${
        nameColors ? 'chat-name-c5' : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      Роман Долженко
    </p>
  );

  return (
    <div
      className={`rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 px-4 py-4 space-y-2 ${
        wallpaper ? '' : 'bg-[#e9e9e9] dark:bg-gray-900'
      }`}
      style={wallpaper ?? undefined}
    >
      {chatBubbles ? (
        <>
          {/* Исходящее */}
          <div className="flex justify-end">
            <div className="bg-bubble-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%]">
              <p style={ts}>Доброе утро! 👋</p>
              <p className="text-[10px] text-white/70 text-right mt-0.5">21:18</p>
            </div>
          </div>
          {/* Входящее с цитатой */}
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-transparent shadow-sm rounded-2xl rounded-tl-sm px-3 py-2 max-w-[75%]">
              {incomingName}
              <div className="border-l-2 border-violet-400 bg-violet-500/10 rounded px-2 py-1 mb-1">
                <p className="text-xs font-medium text-violet-500">Роман Долженко</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Доброе утро! 👋
                </p>
              </div>
              <p style={ts}>Знаешь, который час?</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">21:20</p>
            </div>
          </div>
          {/* Исходящее */}
          <div className="flex justify-end">
            <div className="bg-bubble-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%]">
              <p style={ts}>В Токио утро 😎</p>
              <p className="text-[10px] text-white/70 text-right mt-0.5">21:22</p>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Режим «блоками» — плоский список, как в Telegram Desktop */}
          {[
            { name: 'Вы', cls: 'chat-name-c2', text: 'Доброе утро! 👋', time: '21:18' },
            { name: 'Роман Долженко', cls: 'chat-name-c5', text: 'Знаешь, который час?', time: '21:20' },
            { name: 'Вы', cls: 'chat-name-c2', text: 'В Токио утро 😎', time: '21:22' },
          ].map((m, i) => (
            <div key={i} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-sky-500 text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                {m.name === 'Вы' ? 'Я' : 'РД'}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      nameColors ? m.cls : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {m.name}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{m.time}</span>
                </div>
                <p className="text-gray-800 dark:text-gray-100" style={ts}>{m.text}</p>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ── Строка настройки ── */
function SettingRow({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3 ${
        last ? '' : 'border-b border-gray-100 dark:border-gray-700/60'
      }`}
    >
      <span className="text-sm text-gray-800 dark:text-gray-100">{label}</span>
      {children}
    </div>
  );
}

export default function AppearanceSettings() {
  const theme = useThemeStore((s) => s.theme);
  const appearance = useThemeStore((s) => s.appearance);
  const setAppearance = useThemeStore((s) => s.setAppearance);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const addToast = useToastStore((s) => s.addToast);
  const companyAccent = useThemeStore((s) => s.companyAccent);
  const effectiveAccent = appearance.accentSetByUser
    ? appearance.accent
    : companyAccent ?? appearance.accent;
  const [open, setOpen] = useState(false);
  const [wpUploading, setWpUploading] = useState(false);
  const wpInputRef = useRef<HTMLInputElement>(null);

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setWpUploading(true);
    try {
      const compressed = await compressWallpaper(file);
      const formData = new FormData();
      formData.append('file', compressed);
      const { data } = await api.post('/users/avatar/upload', formData);
      setAppearance({ chatWallpaper: 'custom', customWallpaperUrl: data.fileUrl });
      addToast('success', 'Обои загружены');
    } catch {
      addToast('error', 'Ошибка загрузки обоев');
    } finally {
      setWpUploading(false);
    }
  };

  const NIGHT_OPTIONS: { id: NightMode; name: string }[] = [
    { id: 'off', name: 'Отключена' },
    { id: 'system', name: 'Системная' },
    { id: 'scheduled', name: 'По расписанию' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-6 mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
            Оформление
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Цветовая тема, акцент и вид чата. Настройки сохраняются в вашем профиле.
          </p>
        </div>
        <svg
          className={`w-5 h-5 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
      <div className="mt-4">
      {/* Превью чата */}
      <ChatPreview />

      {/* Темы-пресеты */}
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-5 mb-3">
        Цветовая тема
      </p>
      <div className="flex items-start gap-3 flex-wrap">
        {THEME_PRESETS.map((p) => (
          <PresetCard
            key={p.id}
            id={p.id}
            name={p.name}
            active={appearance.mode === p.id}
            onSelect={() => setAppearance({ mode: p.id })}
          />
        ))}
      </div>

      {/* Акцентные цвета */}
      <div className="flex items-center gap-2.5 flex-wrap mt-4">
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            title={a.name}
            onClick={() => setAppearance({ accent: a.id, accentSetByUser: true })}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{ background: a.color }}
          >
            {effectiveAccent === a.id && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {companyAccent && appearance.accentSetByUser && (
        <button
          type="button"
          onClick={() => setAppearance({ accentSetByUser: false })}
          className="mt-2 text-xs text-violet-500 hover:text-violet-600"
        >
          Вернуть фирменный цвет компании
        </button>
      )}

      {/* Цвет исходящих сообщений */}
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-5 mb-3">
        Цвет сообщений
      </p>
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* «Как акцент» — пузыри следуют за акцентом приложения */}
        <button
          type="button"
          title="Как акцент приложения"
          onClick={() => setAppearance({ bubbleColor: 'accent' })}
          className="w-9 h-9 rounded-full bg-violet-500 flex items-center justify-center transition-transform hover:scale-110"
        >
          {appearance.bubbleColor === 'accent' ? (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          )}
        </button>
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            title={a.name}
            onClick={() => setAppearance({ bubbleColor: a.id })}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{ background: a.color }}
          >
            {appearance.bubbleColor === a.id && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Цвет ваших сообщений в чате. Первый вариант — следовать акценту приложения.
      </p>

      {/* Переключатели */}
      <div className="mt-5">
        <SettingRow label="Тёмное оформление">
          <Switch checked={theme === 'dark'} onChange={() => toggleTheme()} />
        </SettingRow>
        <SettingRow label="Liquid Glass — жидкое стекло">
          <Switch
            checked={appearance.liquidGlass}
            onChange={(v) => setAppearance({ liquidGlass: v })}
          />
        </SettingRow>
        <SettingRow label="Компактный режим">
          <Switch
            checked={appearance.density === 'compact'}
            onChange={(v) => setAppearance({ density: v ? 'compact' : 'comfortable' })}
          />
        </SettingRow>
        <SettingRow label="Сообщения блоками">
          <Switch
            checked={appearance.chatBubbles}
            onChange={(v) => setAppearance({ chatBubbles: v })}
          />
        </SettingRow>
        <SettingRow label="Цвет имени" last>
          <Switch
            checked={appearance.nameColors}
            onChange={(v) => setAppearance({ nameColors: v })}
          />
        </SettingRow>
      </div>

      {/* Обои для чатов */}
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-5 mb-3">
        Обои для чатов
      </p>
      <div className="flex items-start gap-3 flex-wrap">
        {WALLPAPERS.map((w) => {
          const bg = theme === 'dark' ? w.dark : w.light;
          const active = appearance.chatWallpaper === w.id;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setAppearance({ chatWallpaper: w.id })}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className={`w-[72px] h-[52px] rounded-lg border-2 transition-colors flex items-center justify-center ${
                  active
                    ? 'border-violet-500'
                    : 'border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600'
                } ${bg ? '' : 'bg-[#e9e9e9] dark:bg-gray-900'}`}
                style={bg ? { background: bg } : undefined}
              >
                {active && (
                  <span className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] ${
                  active ? 'text-violet-500 font-medium' : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {w.name}
              </span>
            </button>
          );
        })}

        {/* Свои обои — загрузка собственной картинки */}
        <div className="flex flex-col items-center gap-1.5 group relative">
          <input
            ref={wpInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={wpUploading}
            onChange={handleWallpaperUpload}
          />
          <button
            type="button"
            disabled={wpUploading}
            onClick={() => {
              if (appearance.customWallpaperUrl) {
                setAppearance({ chatWallpaper: 'custom' });
              } else {
                wpInputRef.current?.click();
              }
            }}
            className={`w-[72px] h-[52px] rounded-lg border-2 transition-colors flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900 bg-cover bg-center ${
              appearance.chatWallpaper === 'custom'
                ? 'border-violet-500'
                : 'border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600'
            } ${wpUploading ? 'opacity-50' : ''}`}
            style={
              appearance.customWallpaperUrl
                ? { backgroundImage: `url('${appearance.customWallpaperUrl}')` }
                : undefined
            }
          >
            {wpUploading ? (
              <svg className="w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : appearance.chatWallpaper === 'custom' ? (
              <span className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </span>
            ) : !appearance.customWallpaperUrl ? (
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            ) : null}
          </button>
          {/* Заменить картинку */}
          {appearance.customWallpaperUrl && !wpUploading && (
            <button
              type="button"
              title="Заменить картинку"
              onClick={() => wpInputRef.current?.click()}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-700/80 hover:bg-gray-700 text-white flex items-center justify-center"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          <span
            className={`text-[11px] ${
              appearance.chatWallpaper === 'custom'
                ? 'text-violet-500 font-medium'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            Свои
          </span>
        </div>
      </div>

      {/* Узор поверх обоев */}
      <div className="mt-3">
        <SettingRow label="Узор поверх обоев" last>
          <Switch
            checked={appearance.chatPattern}
            onChange={(v) => setAppearance({ chatPattern: v })}
          />
        </SettingRow>
      </div>

      {/* Размер текста */}
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-5 mb-3">
        Размер текста
      </p>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">A</span>
        <input
          type="range"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          step={1}
          value={appearance.fontSize}
          onChange={(e) => setAppearance({ fontSize: Number(e.target.value) })}
          className="flex-1 accent-violet-500"
        />
        <span className="text-lg text-gray-500 dark:text-gray-400 font-medium">A</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 w-10 text-right tabular-nums">
          {appearance.fontSize} px
        </span>
      </div>

      {/* Размер текста в чате */}
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-5 mb-3">
        Размер текста в чате
      </p>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">A</span>
        <input
          type="range"
          min={CHAT_FONT_SIZE_MIN}
          max={CHAT_FONT_SIZE_MAX}
          step={1}
          value={appearance.chatFontSize}
          onChange={(e) => setAppearance({ chatFontSize: Number(e.target.value) })}
          className="flex-1 accent-violet-500"
        />
        <span className="text-lg text-gray-500 dark:text-gray-400 font-medium">A</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 w-10 text-right tabular-nums">
          {appearance.chatFontSize} px
        </span>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Влияет только на текст сообщений в чате, не затрагивая остальной интерфейс.
      </p>

      {/* Смена темы ночью */}
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-5 mb-3">
        Смена темы ночью
      </p>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {NIGHT_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setAppearance({ nightMode: o.id })}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                appearance.nightMode === o.id
                  ? 'bg-violet-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {o.name}
            </button>
          ))}
        </div>
        {appearance.nightMode === 'scheduled' && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>с</span>
            <input
              type="time"
              value={appearance.nightStart}
              onChange={(e) => setAppearance({ nightStart: e.target.value })}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <span>до</span>
            <input
              type="time"
              value={appearance.nightEnd}
              onChange={(e) => setAppearance({ nightEnd: e.target.value })}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        )}
      </div>
      {appearance.nightMode !== 'off' && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          {appearance.nightMode === 'system'
            ? 'Тёмная тема включится автоматически вместе с тёмной темой системы.'
            : 'Тёмная тема включится автоматически в указанный период.'}
        </p>
      )}

      {/* Стартовая страница */}
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-5 mb-3">
        Стартовая страница
      </p>
      <select
        value={appearance.startPage}
        onChange={(e) => setAppearance({ startPage: e.target.value })}
        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
      >
        {START_PAGES.map((p) => (
          <option key={p.value} value={p.value}>{p.name}</option>
        ))}
      </select>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Раздел, который откроется после входа в систему.
      </p>

      {/* Тихие часы */}
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mt-5 mb-3">
        Тихие часы уведомлений
      </p>
      <SettingRow label="Включить тихие часы" last={!appearance.quietHours.enabled}>
        <Switch
          checked={appearance.quietHours.enabled}
          onChange={(v) =>
            setAppearance({ quietHours: { ...appearance.quietHours, enabled: v } })
          }
        />
      </SettingRow>
      {appearance.quietHours.enabled && (
        <>
          <div className="flex items-center gap-2 py-3 text-sm text-gray-600 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700/60">
            <span>с</span>
            <input
              type="time"
              value={appearance.quietHours.start}
              onChange={(e) =>
                setAppearance({ quietHours: { ...appearance.quietHours, start: e.target.value } })
              }
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <span>до</span>
            <input
              type="time"
              value={appearance.quietHours.end}
              onChange={(e) =>
                setAppearance({ quietHours: { ...appearance.quietHours, end: e.target.value } })
              }
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <SettingRow label="Глушить звук">
            <Switch
              checked={appearance.quietHours.muteSound}
              onChange={(v) =>
                setAppearance({ quietHours: { ...appearance.quietHours, muteSound: v } })
              }
            />
          </SettingRow>
          <SettingRow label="Глушить всплывающие уведомления" last>
            <Switch
              checked={appearance.quietHours.mutePush}
              onChange={(v) =>
                setAppearance({ quietHours: { ...appearance.quietHours, mutePush: v } })
              }
            />
          </SettingRow>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            В указанный период новые уведомления приходят в колокольчик без звука и
            всплывающих окон.
          </p>
        </>
      )}
      </div>
      )}
    </div>
  );
}
