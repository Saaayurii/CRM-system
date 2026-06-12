'use client';

// Редактор фото перед отправкой (как в Telegram): кадрирование с поворотом и
// отражением, рисование кистью с палитрой и ластиком, текст поверх фото.
// Чистый canvas без зависимостей; результат — новый File через onDone.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/lib/i18n';

interface PhotoEditorProps {
  file: File;
  onCancel: () => void;
  onDone: (edited: File) => void;
}

type Tool = 'crop' | 'draw' | 'text';

interface Stroke {
  color: string; // 'eraser' — стирание
  size: number;  // в координатах изображения
  points: { x: number; y: number }[];
}

interface TextItem {
  id: number;
  text: string;
  color: string;
  /** Центр текста в координатах изображения */
  x: number;
  y: number;
  /** Размер шрифта в координатах изображения */
  size: number;
}

interface CropRect { x: number; y: number; w: number; h: number }

const PALETTE = ['#ffffff', '#fe4438', '#ff8901', '#ffd60a', '#33c759', '#62e5e0', '#0a84ff', '#bd5cf3'];
const ERASER = 'eraser';
const MIN_CROP = 48;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Повернуть/отразить канвас, вернуть новый */
function transformCanvas(src: HTMLCanvasElement, rotate90: boolean, flipH: boolean): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = rotate90 ? src.height : src.width;
  out.height = rotate90 ? src.width : src.height;
  const ctx = out.getContext('2d')!;
  ctx.save();
  ctx.translate(out.width / 2, out.height / 2);
  if (rotate90) ctx.rotate(-Math.PI / 2);
  if (flipH) ctx.scale(-1, 1);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  ctx.restore();
  return out;
}

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  for (const s of strokes) {
    if (s.points.length === 0) continue;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = s.size;
    if (s.color === ERASER) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.strokeStyle = s.color;
    }
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    if (s.points.length === 1) {
      ctx.lineTo(s.points[0].x + 0.01, s.points[0].y + 0.01);
    } else {
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function drawTexts(ctx: CanvasRenderingContext2D, texts: TextItem[]) {
  for (const item of texts) {
    if (!item.text.trim()) continue;
    ctx.save();
    ctx.font = `700 ${item.size}px Inter, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = item.size / 6;
    ctx.shadowOffsetY = item.size / 18;
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.x, item.y);
    ctx.restore();
  }
}

export default function PhotoEditor({ file, onCancel, onDone }: PhotoEditorProps) {
  const t = useT();
  const [tool, setTool] = useState<Tool>('draw');
  const [base, setBase] = useState<HTMLCanvasElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Рисование
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [drawColor, setDrawColor] = useState('#fe4438');
  const [drawSize, setDrawSize] = useState(6); // в экранных px, в координаты изображения переводится при рисовании
  const activeStrokeRef = useRef<Stroke | null>(null);

  // Текст
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<number | null>(null);
  const [editingTextId, setEditingTextId] = useState<number | null>(null);
  const textSeqRef = useRef(1);
  const textDragRef = useRef<{ id: number; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Кадрирование
  const [crop, setCrop] = useState<CropRect | null>(null);
  const cropDragRef = useRef<{
    kind: 'move' | 'nw' | 'ne' | 'sw' | 'se';
    startX: number; startY: number; orig: CropRect;
  } | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const viewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [fitScale, setFitScale] = useState(1);

  // ── Загрузка исходника ────────────────────────────────────────────────────
  useEffect(() => {
    let revoked = false;
    const url = URL.createObjectURL(file);
    loadImage(url)
      .then((img) => {
        if (revoked) return;
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d')!.drawImage(img, 0, 0);
        setBase(c);
      })
      .catch(() => setLoadError(true))
      .finally(() => URL.revokeObjectURL(url));
    return () => { revoked = true; };
  }, [file]);

  // ── Подгонка под экран ────────────────────────────────────────────────────
  const recomputeFit = useCallback(() => {
    if (!base) return;
    const maxW = Math.min(window.innerWidth - 32, 1100);
    const maxH = window.innerHeight - 190; // шапка + панель инструментов
    setFitScale(Math.min(maxW / base.width, maxH / base.height, 1));
  }, [base]);

  useEffect(() => {
    recomputeFit();
    window.addEventListener('resize', recomputeFit);
    return () => window.removeEventListener('resize', recomputeFit);
  }, [recomputeFit]);

  // ── Отрисовка предпросмотра (база + штрихи; тексты — DOM-слоем) ───────────
  const repaint = useCallback(() => {
    const canvas = viewCanvasRef.current;
    if (!canvas || !base) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width = base.width;
    canvas.height = base.height;
    ctx.drawImage(base, 0, 0);
    drawStrokes(ctx, activeStrokeRef.current ? [...strokes, activeStrokeRef.current] : strokes);
  }, [base, strokes]);

  useEffect(() => { repaint(); }, [repaint]);

  const displayW = base ? base.width * fitScale : 0;
  const displayH = base ? base.height * fitScale : 0;

  const toImageCoords = useCallback((clientX: number, clientY: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || fitScale === 0) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) / fitScale, y: (clientY - rect.top) / fitScale };
  }, [fitScale]);

  // ── Кисть ─────────────────────────────────────────────────────────────────
  const onDrawPointerDown = (e: React.PointerEvent) => {
    if (tool !== 'draw' || !base) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = toImageCoords(e.clientX, e.clientY);
    activeStrokeRef.current = { color: drawColor, size: drawSize / fitScale, points: [p] };
    repaint();
  };
  const onDrawPointerMove = (e: React.PointerEvent) => {
    if (!activeStrokeRef.current) return;
    activeStrokeRef.current.points.push(toImageCoords(e.clientX, e.clientY));
    repaint();
  };
  const onDrawPointerUp = () => {
    if (!activeStrokeRef.current) return;
    const done = activeStrokeRef.current;
    activeStrokeRef.current = null;
    setStrokes((prev) => [...prev, done]);
  };

  // ── Текст ─────────────────────────────────────────────────────────────────
  const addTextAt = (clientX: number, clientY: number) => {
    if (!base) return;
    const p = toImageCoords(clientX, clientY);
    const id = textSeqRef.current++;
    const size = Math.max(24, Math.round(base.width / 14));
    setTexts((prev) => [...prev, { id, text: '', color: drawColor === ERASER ? '#ffffff' : drawColor, x: p.x, y: p.y, size }]);
    setSelectedTextId(id);
    setEditingTextId(id);
  };

  const onTextLayerPointerDown = (e: React.PointerEvent) => {
    if (tool !== 'text') return;
    // клик по пустому месту — новый текст
    if (e.target === e.currentTarget) {
      addTextAt(e.clientX, e.clientY);
    }
  };

  const onTextItemPointerDown = (e: React.PointerEvent, item: TextItem) => {
    e.stopPropagation();
    setSelectedTextId(item.id);
    if (editingTextId === item.id) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    textDragRef.current = { id: item.id, startX: e.clientX, startY: e.clientY, origX: item.x, origY: item.y };
  };
  const onTextItemPointerMove = (e: React.PointerEvent) => {
    const d = textDragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / fitScale;
    const dy = (e.clientY - d.startY) / fitScale;
    setTexts((prev) => prev.map((it) => (it.id === d.id ? { ...it, x: d.origX + dx, y: d.origY + dy } : it)));
  };
  const onTextItemPointerUp = () => { textDragRef.current = null; };

  const selectedText = useMemo(
    () => texts.find((it) => it.id === selectedTextId) ?? null,
    [texts, selectedTextId],
  );

  const patchSelectedText = (patch: Partial<TextItem>) => {
    if (selectedTextId == null) return;
    setTexts((prev) => prev.map((it) => (it.id === selectedTextId ? { ...it, ...patch } : it)));
  };

  // ── Кадрирование ──────────────────────────────────────────────────────────
  const startCrop = () => {
    if (!base) return;
    setTool('crop');
    setCrop({ x: 0, y: 0, w: base.width, h: base.height });
  };

  const rotate90 = () => {
    if (!base) return;
    // Запекаем штрихи перед трансформацией, чтобы не пересчитывать координаты
    bakeOverlays();
    setBase((b) => (b ? transformCanvas(b, true, false) : b));
    setCrop(null);
  };
  const flipH = () => {
    if (!base) return;
    bakeOverlays();
    setBase((b) => (b ? transformCanvas(b, false, true) : b));
    setCrop(null);
  };

  /** Запечь штрихи и тексты в базу (перед поворотом/кропом) */
  const bakeOverlays = useCallback(() => {
    setBase((b) => {
      if (!b) return b;
      const hasInk = strokes.length > 0 || texts.some((it) => it.text.trim());
      if (!hasInk) return b;
      const ctx = b.getContext('2d')!;
      drawStrokes(ctx, strokes);
      drawTexts(ctx, texts);
      return b;
    });
    setStrokes([]);
    setTexts([]);
    setSelectedTextId(null);
    setEditingTextId(null);
  }, [strokes, texts]);

  const applyCrop = () => {
    if (!base || !crop) return;
    bakeOverlays();
    setBase((b) => {
      if (!b) return b;
      const out = document.createElement('canvas');
      out.width = Math.max(1, Math.round(crop.w));
      out.height = Math.max(1, Math.round(crop.h));
      out.getContext('2d')!.drawImage(b, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height);
      return out;
    });
    setCrop(null);
    setTool('draw');
  };

  const onCropPointerDown = (e: React.PointerEvent, kind: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    if (!crop) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    cropDragRef.current = { kind, startX: e.clientX, startY: e.clientY, orig: { ...crop } };
  };
  const onCropPointerMove = (e: React.PointerEvent) => {
    const d = cropDragRef.current;
    if (!d || !base) return;
    const dx = (e.clientX - d.startX) / fitScale;
    const dy = (e.clientY - d.startY) / fitScale;
    const o = d.orig;
    let { x, y, w, h } = o;
    const minC = Math.min(MIN_CROP, base.width, base.height);
    if (d.kind === 'move') {
      x = Math.min(Math.max(0, o.x + dx), base.width - o.w);
      y = Math.min(Math.max(0, o.y + dy), base.height - o.h);
    } else {
      if (d.kind === 'nw' || d.kind === 'sw') {
        x = Math.min(Math.max(0, o.x + dx), o.x + o.w - minC);
        w = o.w + (o.x - x);
      } else {
        w = Math.min(Math.max(minC, o.w + dx), base.width - o.x);
      }
      if (d.kind === 'nw' || d.kind === 'ne') {
        y = Math.min(Math.max(0, o.y + dy), o.y + o.h - minC);
        h = o.h + (o.y - y);
      } else {
        h = Math.min(Math.max(minC, o.h + dy), base.height - o.y);
      }
    }
    setCrop({ x, y, w, h });
  };
  const onCropPointerUp = () => { cropDragRef.current = null; };

  // ── Экспорт ───────────────────────────────────────────────────────────────
  const handleDone = async () => {
    if (!base || exporting) return;
    setExporting(true);
    try {
      const out = document.createElement('canvas');
      out.width = base.width;
      out.height = base.height;
      const ctx = out.getContext('2d')!;
      ctx.drawImage(base, 0, 0);
      drawStrokes(ctx, strokes);
      drawTexts(ctx, texts);
      const isPng = file.type === 'image/png';
      const blob = await new Promise<Blob | null>((resolve) =>
        out.toBlob(resolve, isPng ? 'image/png' : 'image/jpeg', 0.92),
      );
      if (!blob) throw new Error('toBlob failed');
      const name = file.name.replace(/(\.[^.]+)?$/, isPng ? '_edited.png' : '_edited.jpg');
      onDone(new File([blob], name, { type: blob.type }));
    } catch {
      setExporting(false);
    }
  };

  const undoStroke = () => setStrokes((prev) => prev.slice(0, -1));
  const clearAll = () => { setStrokes([]); setTexts((prev) => prev.filter((it) => it.id === editingTextId)); };

  const toolBtn = (active: boolean) =>
    `p-2.5 rounded-xl transition-colors ${active ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`;

  const cropHandle = 'absolute w-5 h-5 -m-2.5 bg-white rounded-full shadow border border-gray-300';

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/95 flex flex-col select-none" onClick={(e) => e.stopPropagation()}>
      {/* Шапка */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button onClick={onCancel} className="px-3 py-1.5 text-white/70 hover:text-white text-sm rounded-lg hover:bg-white/10 transition-colors">
          {t('Отмена')}
        </button>
        <div className="flex items-center gap-2">
          {tool === 'draw' && (
            <>
              <button onClick={undoStroke} disabled={strokes.length === 0}
                className="px-3 py-1.5 text-white/70 hover:text-white disabled:opacity-30 text-sm rounded-lg hover:bg-white/10 transition-colors">
                {t('Отменить')}
              </button>
              <button onClick={clearAll} disabled={strokes.length === 0 && texts.length === 0}
                className="px-3 py-1.5 text-white/70 hover:text-white disabled:opacity-30 text-sm rounded-lg hover:bg-white/10 transition-colors">
                {t('Очистить всё')}
              </button>
            </>
          )}
          {tool === 'crop' && crop && (
            <button onClick={applyCrop}
              className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-lg transition-colors">
              {t('Применить кадр')}
            </button>
          )}
        </div>
      </div>

      {/* Полотно */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-4">
        {loadError ? (
          <p className="text-white/60 text-sm">{t('Не удалось открыть изображение')}</p>
        ) : !base ? (
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        ) : (
          <div
            ref={wrapRef}
            className="relative"
            style={{ width: displayW, height: displayH, touchAction: 'none' }}
          >
            <canvas
              ref={viewCanvasRef}
              className="absolute inset-0 w-full h-full rounded-lg"
              style={{ cursor: tool === 'draw' ? 'crosshair' : 'default' }}
              onPointerDown={onDrawPointerDown}
              onPointerMove={onDrawPointerMove}
              onPointerUp={onDrawPointerUp}
              onPointerCancel={onDrawPointerUp}
            />

            {/* Текстовый слой */}
            <div
              className="absolute inset-0"
              style={{ pointerEvents: tool === 'text' ? 'auto' : 'none', cursor: tool === 'text' ? 'text' : 'default' }}
              onPointerDown={onTextLayerPointerDown}
            >
              {texts.map((item) => (
                <div
                  key={item.id}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-pre ${selectedTextId === item.id && tool === 'text' ? 'ring-1 ring-white/60 rounded' : ''}`}
                  style={{
                    left: item.x * fitScale,
                    top: item.y * fitScale,
                    fontSize: item.size * fitScale,
                    fontWeight: 700,
                    color: item.color,
                    textShadow: '0 1px 6px rgba(0,0,0,0.55)',
                    pointerEvents: 'auto',
                    cursor: 'move',
                    fontFamily: 'Inter, -apple-system, sans-serif',
                    lineHeight: 1.1,
                  }}
                  onPointerDown={(e) => onTextItemPointerDown(e, item)}
                  onPointerMove={onTextItemPointerMove}
                  onPointerUp={onTextItemPointerUp}
                  onDoubleClick={() => setEditingTextId(item.id)}
                >
                  {editingTextId === item.id ? (
                    <input
                      autoFocus
                      value={item.text}
                      placeholder={t('Текст…')}
                      onChange={(e) => setTexts((prev) => prev.map((it) => (it.id === item.id ? { ...it, text: e.target.value } : it)))}
                      onBlur={() => {
                        setEditingTextId(null);
                        setTexts((prev) => prev.filter((it) => it.text.trim() || it.id !== item.id));
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
                      className="bg-transparent outline-none text-center placeholder-white/40"
                      style={{ color: item.color, fontSize: 'inherit', fontWeight: 700, width: `${Math.max(item.text.length + 2, 8)}ch` }}
                    />
                  ) : (
                    item.text || ' '
                  )}
                </div>
              ))}
            </div>

            {/* Рамка кадрирования */}
            {tool === 'crop' && crop && (
              <div className="absolute inset-0">
                {/* затемнение вне кадра */}
                <div
                  className="absolute border border-white/90"
                  style={{
                    left: crop.x * fitScale,
                    top: crop.y * fitScale,
                    width: crop.w * fitScale,
                    height: crop.h * fitScale,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                    cursor: 'move',
                    touchAction: 'none',
                  }}
                  onPointerDown={(e) => onCropPointerDown(e, 'move')}
                  onPointerMove={onCropPointerMove}
                  onPointerUp={onCropPointerUp}
                >
                  {/* сетка третей */}
                  <div className="absolute inset-y-0 left-1/3 w-px bg-white/30" />
                  <div className="absolute inset-y-0 left-2/3 w-px bg-white/30" />
                  <div className="absolute inset-x-0 top-1/3 h-px bg-white/30" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-white/30" />
                  {(['nw', 'ne', 'sw', 'se'] as const).map((k) => (
                    <div
                      key={k}
                      className={cropHandle}
                      style={{
                        left: k === 'nw' || k === 'sw' ? 0 : '100%',
                        top: k === 'nw' || k === 'ne' ? 0 : '100%',
                        cursor: k === 'nw' || k === 'se' ? 'nwse-resize' : 'nesw-resize',
                        touchAction: 'none',
                      }}
                      onPointerDown={(e) => onCropPointerDown(e, k)}
                      onPointerMove={onCropPointerMove}
                      onPointerUp={onCropPointerUp}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Палитра и размер — для кисти и текста */}
      {(tool === 'draw' || tool === 'text') && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 shrink-0 flex-wrap">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => {
                setDrawColor(c);
                if (tool === 'text') patchSelectedText({ color: c });
              }}
              className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                background: c,
                borderColor: (tool === 'text' ? selectedText?.color === c : drawColor === c) ? '#fff' : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
          {tool === 'draw' && (
            <button
              onClick={() => setDrawColor(ERASER)}
              title={t('Ластик')}
              className="w-7 h-7 rounded-full border-2 flex items-center justify-center bg-white/10 text-white"
              style={{ borderColor: drawColor === ERASER ? '#fff' : 'rgba(255,255,255,0.25)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 13l-7.5 7.5a2 2 0 01-2.8 0L4 15.8a2 2 0 010-2.8L13 4l7 7-1 2zM6 21h12" />
              </svg>
            </button>
          )}
          <input
            type="range"
            min={tool === 'draw' ? 2 : 14}
            max={tool === 'draw' ? 28 : 120}
            value={tool === 'draw' ? drawSize : Math.round((selectedText?.size ?? 40) * fitScale)}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (tool === 'draw') setDrawSize(v);
              else patchSelectedText({ size: v / fitScale });
            }}
            className="w-28 accent-violet-500 ml-2"
          />
          {tool === 'text' && selectedText && (
            <button
              onClick={() => { setTexts((prev) => prev.filter((it) => it.id !== selectedTextId)); setSelectedTextId(null); }}
              className="px-2.5 py-1 text-xs text-red-300 hover:text-red-200 hover:bg-white/10 rounded-lg transition-colors"
            >
              {t('Удалить текст')}
            </button>
          )}
        </div>
      )}

      {/* Подсказка для кадра */}
      {tool === 'crop' && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 shrink-0">
          <button onClick={rotate90} className={toolBtn(false)} title={t('Повернуть на 90°')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h3a2 2 0 012 2v3M21 13v4a4 4 0 01-4 4H7a4 4 0 01-4-4v-6a4 4 0 014-4h7m0 0l-3-3m3 3l-3 3" />
            </svg>
          </button>
          <button onClick={flipH} className={toolBtn(false)} title={t('Отразить по горизонтали')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M7 8l-4 4 4 4M17 8l4 4-4 4" />
            </svg>
          </button>
          <span className="text-white/40 text-xs">{t('Перетащите рамку или углы, затем «Применить кадр»')}</span>
        </div>
      )}

      {/* Нижняя панель инструментов */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-1.5 mx-auto">
          <button onClick={startCrop} className={toolBtn(tool === 'crop')} title={t('Кадрировать')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v14a2 2 0 002 2h12M3 7h14a2 2 0 012 2v12" />
            </svg>
          </button>
          <button onClick={() => { setTool('draw'); setCrop(null); }} className={toolBtn(tool === 'draw')} title={t('Рисунок')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897l12.682-12.68z" />
            </svg>
          </button>
          <button onClick={() => { setTool('text'); setCrop(null); }} className={toolBtn(tool === 'text')} title={t('Текст')}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6V4h16v2M12 4v16m-3 0h6" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleDone}
          disabled={!base || exporting}
          className="absolute right-4 bottom-3 w-12 h-12 rounded-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white flex items-center justify-center shadow-lg transition-colors"
          title={t('Готово')}
        >
          {exporting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
        </button>
      </div>
    </div>,
    document.body,
  );
}
