'use client';

import { useThemeStore } from '@/stores/themeStore';
import {
  ACCENTS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  THEME_PRESETS,
  WALLPAPERS,
  getWallpaperBackground,
  type NightMode,
  type ThemeMode,
} from '@/lib/appearance';

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
  const { chatWallpaper, chatBubbles, nameColors, fontSize } = useThemeStore(
    (s) => s.appearance,
  );
  const wallpaper = getWallpaperBackground(chatWallpaper, theme);
  const ts = { fontSize: `${fontSize}px`, lineHeight: 1.4 };

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
      style={wallpaper ? { background: wallpaper } : undefined}
    >
      {chatBubbles ? (
        <>
          {/* Исходящее */}
          <div className="flex justify-end">
            <div className="bg-violet-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%]">
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
            <div className="bg-violet-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%]">
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

  const NIGHT_OPTIONS: { id: NightMode; name: string }[] = [
    { id: 'off', name: 'Отключена' },
    { id: 'system', name: 'Системная' },
    { id: 'scheduled', name: 'По расписанию' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 shadow-xs rounded-xl p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
        Оформление
      </h2>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
        Цветовая тема, акцент и вид чата. Настройки сохраняются в вашем профиле.
      </p>

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
            onClick={() => setAppearance({ accent: a.id })}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{ background: a.color }}
          >
            {appearance.accent === a.id && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </button>
        ))}
      </div>

      {/* Переключатели */}
      <div className="mt-5">
        <SettingRow label="Тёмное оформление">
          <Switch checked={theme === 'dark'} onChange={() => toggleTheme()} />
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
    </div>
  );
}
