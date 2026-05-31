'use client';

import React from 'react';

/**
 * Минималистичный безопасный рендер Markdown без внешних зависимостей.
 * Поддерживает: заголовки (#..######), списки (-, *, 1.), таблицы (GFM),
 * блоки кода ```, цитаты >, горизонтальные линии ---, а также инлайн
 * **жирный**, *курсив*, `код`, [ссылки](url). HTML экранируется.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inline(raw: string): string {
  let s = escapeHtml(raw);
  // code spans first (protect contents)
  s = s.replace(/`([^`]+)`/g, (_m, c) => `<code class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-[0.85em] font-mono">${c}</code>`);
  // bold then italic
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  // links [text](url) — only http(s)/relative
  s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)/g, (_m, t, u) =>
    `<a href="${u}" target="_blank" rel="noopener noreferrer" class="text-violet-600 dark:text-violet-400 hover:underline">${t}</a>`);
  return s;
}

interface Block {
  type: 'h' | 'p' | 'ul' | 'ol' | 'quote' | 'code' | 'hr' | 'table';
  level?: number;
  items?: string[];
  text?: string;
  rows?: string[][];
  header?: string[];
}

function parse(md: string): Block[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];

    // code fence
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence
      blocks.push({ type: 'code', text: buf.join('\n') });
      continue;
    }

    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // hr
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      blocks.push({ type: 'h', level: h[1].length, text: h[2] });
      i++;
      continue;
    }

    // table (GFM): header line | separator |---|
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const splitRow = (r: string) =>
        r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && !/^\s*$/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    // quote
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: buf.join(' ') });
      continue;
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // paragraph (collect until blank / block start)
    const buf: string[] = [];
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,6})\s/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^```/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'p', text: buf.join(' ') });
  }
  return blocks;
}

const H_CLS: Record<number, string> = {
  1: 'text-2xl font-bold mt-6 mb-3',
  2: 'text-xl font-bold mt-6 mb-3',
  3: 'text-lg font-semibold mt-5 mb-2',
  4: 'text-base font-semibold mt-4 mb-2',
  5: 'text-sm font-semibold mt-4 mb-2',
  6: 'text-sm font-semibold mt-3 mb-1 text-gray-500',
};

export default function MarkdownView({ content }: { content?: string | null }) {
  if (!content || !content.trim()) {
    return <p className="text-gray-400 italic">Содержание не заполнено.</p>;
  }
  const blocks = parse(content);
  return (
    <div className="text-gray-800 dark:text-gray-200 leading-relaxed text-[15px]">
      {blocks.map((b, idx) => {
        switch (b.type) {
          case 'h': {
            const Tag = `h${b.level}` as keyof React.JSX.IntrinsicElements;
            return (
              <Tag key={idx} className={H_CLS[b.level || 3]} dangerouslySetInnerHTML={{ __html: inline(b.text || '') }} />
            );
          }
          case 'hr':
            return <hr key={idx} className="my-5 border-gray-200 dark:border-gray-700" />;
          case 'code':
            return (
              <pre key={idx} className="my-3 p-3 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto font-mono">
                {b.text}
              </pre>
            );
          case 'quote':
            return (
              <blockquote key={idx} className="my-3 pl-4 border-l-4 border-violet-300 dark:border-violet-500/50 text-gray-600 dark:text-gray-300 italic" dangerouslySetInnerHTML={{ __html: inline(b.text || '') }} />
            );
          case 'ul':
            return (
              <ul key={idx} className="my-3 ml-5 list-disc space-y-1">
                {b.items!.map((it, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: inline(it) }} />
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx} className="my-3 ml-5 list-decimal space-y-1">
                {b.items!.map((it, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: inline(it) }} />
                ))}
              </ol>
            );
          case 'table':
            return (
              <div key={idx} className="my-4 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      {b.header!.map((h, j) => (
                        <th key={j} className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left font-semibold" dangerouslySetInnerHTML={{ __html: inline(h) }} />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows!.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, k) => (
                          <td key={k} className="border border-gray-200 dark:border-gray-700 px-3 py-2 align-top" dangerouslySetInnerHTML={{ __html: inline(c) }} />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return (
              <p key={idx} className="my-3" dangerouslySetInnerHTML={{ __html: inline(b.text || '') }} />
            );
        }
      })}
    </div>
  );
}
