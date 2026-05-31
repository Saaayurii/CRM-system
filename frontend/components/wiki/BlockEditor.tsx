'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { DOC_TYPE_LABELS, DOC_TYPE_COLORS, DOC_STATUS_LABELS, DOC_STATUS_COLORS, type DocType, type DocStatus } from '@/lib/wiki/constants';

export type BlockType =
  | 'paragraph' | 'heading' | 'bulletList' | 'numberedList'
  | 'table' | 'code' | 'image' | 'quote' | 'divider' | 'callout' | 'normRef';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  attrs?: Record<string, any>;
}

interface Props {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  readOnly?: boolean;
}

let _idCounter = 0;
export function newBlock(type: BlockType = 'paragraph', content = ''): Block {
  return { id: `b${Date.now()}-${_idCounter++}`, type, content };
}

const BLOCK_LABELS: Record<BlockType, string> = {
  paragraph: '¶ Текст',
  heading: 'H Заголовок',
  bulletList: '• Список',
  normRef: '📋 Ссылка на норматив',
  numberedList: '1. Нумер. список',
  table: '⊞ Таблица',
  code: '</> Код',
  image: '🖼 Изображение',
  quote: '" Цитата',
  divider: '— Разделитель',
  callout: '💡 Выноска',
};

const BLOCK_MENU_TYPES: BlockType[] = [
  'paragraph', 'heading', 'bulletList', 'numberedList',
  'quote', 'code', 'table', 'image', 'callout', 'normRef', 'divider',
];

const CALLOUT_VARIANTS: Record<string, string> = {
  info:    'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40 text-blue-800 dark:text-blue-200',
  warning: 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-200',
  success: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200',
  danger:  'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/40 text-red-800 dark:text-red-200',
};

function renderBlockPreview(block: Block) {
  switch (block.type) {
    case 'heading': {
      const level = block.attrs?.level ?? 2;
      const cls = level === 1 ? 'text-2xl font-bold' : level === 2 ? 'text-xl font-bold' : 'text-lg font-semibold';
      return <div className={cls}>{block.content || <span className="text-gray-400 italic">Заголовок…</span>}</div>;
    }
    case 'bulletList':
      return (
        <ul className="list-disc list-inside space-y-0.5">
          {(block.content || '').split('\n').filter(Boolean).map((line, i) => <li key={i}>{line}</li>)}
          {!block.content && <li className="text-gray-400 italic">Пункт списка…</li>}
        </ul>
      );
    case 'numberedList':
      return (
        <ol className="list-decimal list-inside space-y-0.5">
          {(block.content || '').split('\n').filter(Boolean).map((line, i) => <li key={i}>{line}</li>)}
          {!block.content && <li className="text-gray-400 italic">Пункт…</li>}
        </ol>
      );
    case 'code':
      return (
        <pre className="bg-gray-900 dark:bg-black text-green-400 rounded-lg p-4 overflow-x-auto text-sm font-mono whitespace-pre-wrap">
          <code>{block.content || '// код…'}</code>
        </pre>
      );
    case 'quote':
      return (
        <blockquote className="border-l-4 border-violet-400 pl-4 italic text-gray-600 dark:text-gray-300">
          {block.content || <span className="text-gray-400">Цитата…</span>}
        </blockquote>
      );
    case 'image':
      return block.content ? (
        <div>
          <img src={block.content} alt={block.attrs?.alt || ''} className="max-w-full rounded-lg" />
          {block.attrs?.caption && <p className="text-xs text-center text-gray-500 mt-1">{block.attrs.caption}</p>}
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center text-gray-400">
          🖼 URL изображения…
        </div>
      );
    case 'table': {
      const rows = block.attrs?.rows as string[][] | undefined;
      if (!rows || rows.length === 0) return <div className="text-gray-400 italic text-sm">Пустая таблица</div>;
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className={ri === 0 ? 'bg-gray-100 dark:bg-gray-800 font-semibold' : ''}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-gray-300 dark:border-gray-600 px-3 py-1.5">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'normRef': {
      const { normId, normCode, normTitle, normDocType, normStatus } = block.attrs || {};
      if (!normId) return (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-sm text-gray-400 text-center">
          📋 Нажмите, чтобы выбрать нормативный документ…
        </div>
      );
      return (
        <Link href={`/dashboard/wiki/${normId}`}
          className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-500/50 bg-gray-50 dark:bg-gray-800/50 transition group no-underline"
          onClick={(e) => e.stopPropagation()}>
          <div className="text-2xl shrink-0">📋</div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {normDocType && <span className={`px-2 py-0.5 rounded text-xs font-semibold ${DOC_TYPE_COLORS[normDocType as DocType] || ''}`}>{DOC_TYPE_LABELS[normDocType as DocType] || normDocType}</span>}
              {normCode && <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{normCode}</span>}
              {normStatus && <span className={`px-2 py-0.5 rounded text-xs ${DOC_STATUS_COLORS[normStatus as DocStatus] || ''}`}>{DOC_STATUS_LABELS[normStatus as DocStatus] || normStatus}</span>}
            </div>
            <p className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate">{normTitle || 'Нормативный документ'}</p>
          </div>
        </Link>
      );
    }
    case 'divider':
      return <hr className="border-gray-300 dark:border-gray-600" />;
    case 'callout': {
      const variant = block.attrs?.variant || 'info';
      const icons: Record<string, string> = { info: '💡', warning: '⚠️', success: '✅', danger: '🚫' };
      return (
        <div className={`flex gap-3 p-4 rounded-lg border ${CALLOUT_VARIANTS[variant]}`}>
          <span className="text-xl shrink-0">{icons[variant]}</span>
          <div>{block.content || <span className="opacity-60">Текст выноски…</span>}</div>
        </div>
      );
    }
    default:
      return <p className="whitespace-pre-wrap leading-relaxed">{block.content || <span className="text-gray-400 italic">Введите текст…</span>}</p>;
  }
}

function BlockEditorItem({
  block,
  index,
  isActive,
  onFocus,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddAfter,
  onTypeChange,
}: {
  block: Block;
  index: number;
  isActive: boolean;
  onFocus: () => void;
  onChange: (b: Block) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddAfter: () => void;
  onTypeChange: (type: BlockType) => void;
}) {
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTypeMenu) return;
    const handler = (e: MouseEvent) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) setShowTypeMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTypeMenu]);

  const update = (patch: Partial<Block>) => onChange({ ...block, ...patch });

  return (
    <div className={`group relative flex gap-2 py-1 rounded-lg transition-colors ${isActive ? 'bg-gray-50 dark:bg-gray-800/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`} onClick={onFocus}>
      {/* Drag handle + controls */}
      <div className="flex flex-col items-center gap-0.5 pt-1 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 text-xs">▲</button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 text-xs">▼</button>
        <div className="relative" ref={typeMenuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowTypeMenu((v) => !v); }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-400 text-xs"
            title="Тип блока"
          >⊞</button>
          {showTypeMenu && (
            <div className="absolute left-7 top-0 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[160px]">
              {BLOCK_MENU_TYPES.map((t) => (
                <button key={t} onClick={(e) => { e.stopPropagation(); onTypeChange(t); setShowTypeMenu(false); }}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${block.type === t ? 'text-violet-600 font-medium' : ''}`}>
                  {BLOCK_LABELS[t]}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 hover:bg-red-100 dark:hover:bg-red-500/10 rounded text-gray-300 hover:text-red-500 text-xs">✕</button>
      </div>

      {/* Block content */}
      <div className="flex-1 min-w-0 pr-2">
        {isActive ? <BlockEditForm block={block} onChange={update} onAddAfter={onAddAfter} /> : renderBlockPreview(block)}
      </div>
    </div>
  );
}

function BlockEditForm({ block, onChange, onAddAfter }: { block: Block; onChange: (b: Block) => void; onAddAfter: () => void }) {
  const update = (patch: Partial<Block>) => onChange({ ...block, ...patch });
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ta.current?.focus(); }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code' && block.type !== 'table') {
      e.preventDefault();
      onAddAfter();
    }
  };

  switch (block.type) {
    case 'heading':
      return (
        <div className="space-y-1">
          <div className="flex gap-2 items-center">
            <select
              value={block.attrs?.level ?? 2}
              onChange={(e) => update({ attrs: { ...block.attrs, level: +e.target.value } })}
              className="text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 bg-white dark:bg-gray-800"
            >
              <option value={1}>H1</option><option value={2}>H2</option><option value={3}>H3</option>
            </select>
          </div>
          <input
            autoFocus
            value={block.content}
            onChange={(e) => update({ content: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Заголовок…"
            className={`w-full bg-transparent outline-none ${block.attrs?.level === 1 ? 'text-2xl font-bold' : block.attrs?.level === 3 ? 'text-lg font-semibold' : 'text-xl font-bold'}`}
          />
        </div>
      );

    case 'code':
      return (
        <div className="space-y-1">
          <input
            value={block.attrs?.language || ''}
            onChange={(e) => update({ attrs: { ...block.attrs, language: e.target.value } })}
            placeholder="Язык (js, python, sql…)"
            className="text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5 bg-white dark:bg-gray-800 w-40 outline-none"
          />
          <textarea
            ref={ta}
            value={block.content}
            onChange={(e) => update({ content: e.target.value })}
            rows={6}
            placeholder="// код…"
            className="w-full font-mono text-sm bg-gray-900 dark:bg-black text-green-400 rounded-lg p-3 outline-none resize-y"
          />
        </div>
      );

    case 'image':
      return (
        <div className="space-y-2">
          <input
            autoFocus
            value={block.content}
            onChange={(e) => update({ content: e.target.value })}
            placeholder="URL изображения…"
            className="w-full bg-transparent outline-none border-b border-gray-300 dark:border-gray-600 text-sm py-0.5"
          />
          <input
            value={block.attrs?.caption || ''}
            onChange={(e) => update({ attrs: { ...block.attrs, caption: e.target.value } })}
            placeholder="Подпись (необязательно)"
            className="w-full bg-transparent outline-none border-b border-gray-300 dark:border-gray-600 text-xs py-0.5 text-gray-500"
          />
          {block.content && <img src={block.content} alt="" className="max-w-xs rounded" />}
        </div>
      );

    case 'table': {
      const rows: string[][] = block.attrs?.rows ?? [['Колонка 1', 'Колонка 2'], ['', '']];
      const setRows = (r: string[][]) => update({ attrs: { ...block.attrs, rows: r } });
      const addRow = () => setRows([...rows, new Array(rows[0]?.length || 2).fill('')]);
      const addCol = () => setRows(rows.map((r) => [...r, '']));
      const removeRow = (ri: number) => setRows(rows.filter((_, i) => i !== ri));
      const removeCol = (ci: number) => setRows(rows.map((r) => r.filter((_, i) => i !== ci)));
      const setCell = (ri: number, ci: number, v: string) => {
        const copy = rows.map((r) => [...r]);
        copy[ri][ci] = v;
        setRows(copy);
      };
      return (
        <div className="space-y-2 overflow-x-auto">
          <table className="border-collapse text-sm">
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="border border-gray-300 dark:border-gray-600 p-0">
                      <input
                        value={cell}
                        onChange={(e) => setCell(ri, ci, e.target.value)}
                        className={`px-2 py-1 outline-none bg-transparent w-24 ${ri === 0 ? 'font-semibold' : ''}`}
                      />
                    </td>
                  ))}
                  <td className="pl-1">
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(ri)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2">
            <button onClick={addRow} className="text-xs text-violet-600 hover:underline">+ Строка</button>
            <button onClick={addCol} className="text-xs text-violet-600 hover:underline">+ Колонка</button>
            {(rows[0]?.length ?? 0) > 1 && <button onClick={() => removeCol(rows[0].length - 1)} className="text-xs text-red-500 hover:underline">− Колонка</button>}
          </div>
        </div>
      );
    }

    case 'callout':
      return (
        <div className="space-y-2">
          <select
            value={block.attrs?.variant || 'info'}
            onChange={(e) => update({ attrs: { ...block.attrs, variant: e.target.value } })}
            className="text-xs border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 bg-white dark:bg-gray-800"
          >
            <option value="info">💡 Информация</option>
            <option value="warning">⚠️ Предупреждение</option>
            <option value="success">✅ Успех</option>
            <option value="danger">🚫 Опасность</option>
          </select>
          <textarea
            ref={ta}
            value={block.content}
            onChange={(e) => update({ content: e.target.value })}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Текст выноски…"
            className="w-full bg-transparent outline-none resize-none"
          />
        </div>
      );

    case 'normRef':
      return <NormRefEditForm block={block} onChange={update} />;

    case 'divider':
      return <hr className="border-gray-300 dark:border-gray-600 my-2" />;

    default:
      return (
        <textarea
          ref={ta}
          value={block.content}
          onChange={(e) => update({ content: e.target.value })}
          onKeyDown={handleKeyDown}
          rows={block.type === 'quote' ? 2 : Math.max(1, (block.content || '').split('\n').length)}
          placeholder={block.type === 'quote' ? 'Цитата…' : block.type === 'bulletList' ? 'Каждая строка — пункт списка' : block.type === 'numberedList' ? 'Каждая строка — пункт' : 'Введите текст…'}
          className="w-full bg-transparent outline-none resize-none leading-relaxed"
          style={{ minHeight: 24 }}
        />
      );
  }
}

function NormRefEditForm({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get('/norm-documents', { params: { q: query, limit: 8 } });
        setResults(data?.data || []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const select = (doc: any) => {
    onChange({ ...block, attrs: { normId: doc.id, normCode: doc.code, normTitle: doc.title, normDocType: doc.docType, normStatus: doc.status } });
    setQuery('');
    setResults([]);
  };

  return (
    <div className="space-y-2">
      {block.attrs?.normId && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
          <span className="flex-1 font-medium truncate">{block.attrs.normCode && `${block.attrs.normCode} — `}{block.attrs.normTitle}</span>
          <button onClick={() => onChange({ ...block, attrs: {} })} className="text-red-400 hover:text-red-600 text-xs shrink-0">✕ Сбросить</button>
        </div>
      )}
      <div className="relative">
        <input
          autoFocus={!block.attrs?.normId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск норматива по коду или названию…"
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-violet-500"
        />
        {searching && <span className="absolute right-3 top-2 text-xs text-gray-400">…</span>}
      </div>
      {results.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
          {results.map((doc) => (
            <button key={doc.id} onClick={() => select(doc)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 dark:hover:bg-violet-500/10 border-b border-gray-100 dark:border-gray-800 last:border-0 flex items-center gap-2">
              {doc.code && <span className="font-mono text-gray-500 shrink-0">{doc.code}</span>}
              <span className="flex-1 truncate">{doc.title}</span>
              <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs ${DOC_TYPE_COLORS[doc.docType as DocType] || ''}`}>{DOC_TYPE_LABELS[doc.docType as DocType] || doc.docType}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BlockEditor({ blocks, onChange, readOnly = false }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const updateBlock = useCallback((id: string, b: Block) => {
    onChange(blocks.map((bl) => bl.id === id ? b : bl));
  }, [blocks, onChange]);

  const deleteBlock = useCallback((id: string) => {
    const next = blocks.filter((b) => b.id !== id);
    onChange(next.length === 0 ? [newBlock()] : next);
    setActiveId(null);
  }, [blocks, onChange]);

  const moveBlock = useCallback((id: string, dir: 1 | -1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const copy = [...blocks];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    onChange(copy);
  }, [blocks, onChange]);

  const addAfter = useCallback((id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const nb = newBlock();
    const copy = [...blocks];
    copy.splice(idx + 1, 0, nb);
    onChange(copy);
    setActiveId(nb.id);
  }, [blocks, onChange]);

  const changeType = useCallback((id: string, type: BlockType) => {
    onChange(blocks.map((b) => b.id === id ? { ...b, type, attrs: type === 'heading' ? { level: 2 } : type === 'callout' ? { variant: 'info' } : type === 'table' ? { rows: [['', ''], ['', '']] } : undefined } : b));
  }, [blocks, onChange]);

  if (readOnly) {
    return (
      <div className="space-y-4">
        {blocks.map((b) => <div key={b.id}>{renderBlockPreview(b)}</div>)}
      </div>
    );
  }

  return (
    <div
      className="space-y-1"
      onClick={() => { if (blocks.length === 0) { const nb = newBlock(); onChange([nb]); setActiveId(nb.id); } }}
    >
      {blocks.length === 0 && (
        <div className="text-center py-12 text-gray-400 cursor-pointer hover:text-gray-500">
          <p>Нажмите, чтобы начать редактировать</p>
        </div>
      )}
      {blocks.map((block, index) => (
        <BlockEditorItem
          key={block.id}
          block={block}
          index={index}
          isActive={activeId === block.id}
          onFocus={() => setActiveId(block.id)}
          onChange={(b) => updateBlock(block.id, b)}
          onDelete={() => deleteBlock(block.id)}
          onMoveUp={() => moveBlock(block.id, -1)}
          onMoveDown={() => moveBlock(block.id, 1)}
          onAddAfter={() => addAfter(block.id)}
          onTypeChange={(t) => changeType(block.id, t)}
        />
      ))}
      <button
        onClick={() => { const nb = newBlock(); onChange([...blocks, nb]); setActiveId(nb.id); }}
        className="w-full py-2 text-sm text-gray-400 hover:text-violet-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors text-left pl-10"
      >
        + Добавить блок
      </button>
    </div>
  );
}
