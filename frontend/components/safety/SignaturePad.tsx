'use client';

import { useEffect, useRef, useState } from 'react';

interface SignaturePadProps {
  width?: number;
  height?: number;
  /** Уже сохранённая подпись (data URL) — показать в read-only. */
  value?: string | null;
  readOnly?: boolean;
  onChange?: (dataUrl: string | null) => void;
  className?: string;
}

export default function SignaturePad({
  width = 480,
  height = 180,
  value,
  readOnly,
  onChange,
  className,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(Boolean(value));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = value;
      setHasInk(true);
    }
  }, [width, height, value]);

  function getPoint(e: PointerEvent | React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent) {
    if (readOnly) return;
    drawingRef.current = true;
    lastRef.current = getPoint(e);
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent) {
    if (!drawingRef.current || readOnly) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const p = getPoint(e);
    const prev = lastRef.current!;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
    if (!hasInk) setHasInk(true);
  }

  function end() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastRef.current = null;
    emitChange();
  }

  function emitChange() {
    if (!onChange) return;
    const canvas = canvasRef.current!;
    if (!hasInk) {
      onChange(null);
      return;
    }
    onChange(canvas.toDataURL('image/png'));
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    setHasInk(false);
    onChange?.(null);
  }

  return (
    <div className={className}>
      <div className="rounded border border-gray-300 dark:border-gray-700 inline-block bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
          style={{ touchAction: 'none', display: 'block' }}
        />
      </div>
      {!readOnly && (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={clear}
            className="px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Очистить
          </button>
          <span className="text-xs text-gray-500">
            {hasInk ? 'Подпись готова' : 'Распишитесь в поле выше'}
          </span>
        </div>
      )}
    </div>
  );
}
