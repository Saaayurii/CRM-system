'use client';

// Выбор своего цвета как в редакторе тем Telegram: спектр (тон по горизонтали,
// насыщенность по вертикали), ползунок яркости и hex-поле. Применяется живьём
// через onChange — родитель кладёт значение в настройки оформления.

import { useCallback, useRef, useState } from 'react';
import { HEX_COLOR_RE } from '@/lib/appearance';

/* ── HSL ⇄ HEX ── */

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = ln - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const HUE_GRADIENT =
  'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)';

interface ColorPickerProps {
  value: string; // #RRGGBB
  onChange: (hex: string) => void;
}

interface PickerState {
  source: string; // hex, которому соответствует hsl (для сверки с value)
  hsl: { h: number; s: number; l: number };
  hexInput: string;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  // hsl храним отдельно от value: round-trip через hex теряет тон у серых
  // и на краях спектра, из-за чего курсор прыгал бы при перетаскивании
  const [state, setState] = useState<PickerState>(() => ({
    source: value.toLowerCase(),
    hsl: hexToHsl(value),
    hexInput: value.toUpperCase(),
  }));
  // value сменили снаружи (выбрали пресет) — пересинхронизируемся в рендере
  if (state.source !== value.toLowerCase()) {
    setState({
      source: value.toLowerCase(),
      hsl: hexToHsl(value),
      hexInput: value.toUpperCase(),
    });
  }
  const { hsl } = state;
  const fieldRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const emit = useCallback(
    (h: number, s: number, l: number) => {
      const hex = hslToHex(h, s, l);
      setState({ source: hex, hsl: { h, s, l }, hexInput: hex.toUpperCase() });
      onChange(hex);
    },
    [onChange],
  );

  /* Спектр: x — тон, y — насыщенность (сверху бледнее, снизу сочнее) */
  const handleFieldPointer = useCallback(
    (e: React.PointerEvent) => {
      const el = fieldRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      emit(Math.round(x * 360) % 360, Math.round(y * 100), hsl.l);
    },
    [emit, hsl.l],
  );

  /* Ползунок яркости: слева светлее, справа темнее */
  const handleSliderPointer = useCallback(
    (e: React.PointerEvent) => {
      const el = sliderRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      emit(hsl.h, hsl.s, Math.round((1 - x) * 100));
    },
    [emit, hsl.h, hsl.s],
  );

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleHexInput = (raw: string) => {
    let v = raw.trim();
    if (v && !v.startsWith('#')) v = `#${v}`;
    if (HEX_COLOR_RE.test(v)) {
      setState({ source: v.toLowerCase(), hsl: hexToHsl(v), hexInput: v.toUpperCase() });
      onChange(v.toLowerCase());
    } else {
      setState((s) => ({ ...s, hexInput: v.toUpperCase() }));
    }
  };

  const current = hslToHex(hsl.h, hsl.s, hsl.l);
  const fieldColor = hslToHex(hsl.h, hsl.s, 50);

  return (
    <div className="mt-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 max-w-md">
      {/* Текущий цвет + hex */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="w-8 h-8 rounded-full border border-black/10 dark:border-white/10 shrink-0"
          style={{ background: current }}
        />
        <input
          value={state.hexInput}
          onChange={(e) => handleHexInput(e.target.value)}
          spellCheck={false}
          maxLength={7}
          className="w-28 px-2 py-1.5 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      </div>

      {/* Спектр */}
      <div
        ref={fieldRef}
        onPointerDown={(e) => { startDrag(e); handleFieldPointer(e); }}
        onPointerMove={(e) => { if (e.buttons === 1) handleFieldPointer(e); }}
        className="relative h-36 rounded-lg cursor-crosshair touch-none select-none"
        style={{
          background: `linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0)), ${HUE_GRADIENT}`,
        }}
      >
        <span
          className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md pointer-events-none"
          style={{
            left: `${(hsl.h / 360) * 100}%`,
            top: `${hsl.s}%`,
            background: current,
          }}
        />
      </div>

      {/* Яркость */}
      <div
        ref={sliderRef}
        onPointerDown={(e) => { startDrag(e); handleSliderPointer(e); }}
        onPointerMove={(e) => { if (e.buttons === 1) handleSliderPointer(e); }}
        className="relative h-5 rounded-full mt-3 cursor-pointer touch-none select-none"
        style={{
          background: `linear-gradient(to right, #ffffff 0%, ${fieldColor} 50%, #000000 100%)`,
        }}
      >
        <span
          className="absolute top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md pointer-events-none"
          style={{ left: `${100 - hsl.l}%`, background: current }}
        />
      </div>
    </div>
  );
}
