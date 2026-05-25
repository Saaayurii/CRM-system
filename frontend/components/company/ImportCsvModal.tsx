'use client';

import { useRef, useState } from 'react';
import api from '@/lib/api';
import { useToastStore } from '@/stores/toastStore';

interface ProjectCategoryLite {
  id: number;
  name: string;
}

interface ParsedRow {
  rowIdx: number;
  categoryName?: string;
  name: string;
  description?: string;
  unit?: string;
  cost?: number;
  prices?: { projectCategoryName: string; price: number }[];
  rawIssues: string[];
}

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
  createdCategories: string[];
  createdProjectCategories: string[];
  dryRun: boolean;
}

const FIXED_HEADERS = ['категория', 'название', 'описание', 'ед.', 'единица', 'единица измерения', 'себест.', 'себестоимость', 'cost'];

function parseCsv(text: string): string[][] {
  // BOM strip
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let i = 0;
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',' || ch === ';' || ch === '\t') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      row.push(field);
      field = '';
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      if (ch === '\r' && text[i + 1] === '\n') i++;
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.length > 0)) rows.push(row);
  }
  return rows;
}

function detectDelimiter(firstLine: string): ',' | ';' | '\t' {
  if (firstLine.includes('\t')) return '\t';
  if (firstLine.split(';').length > firstLine.split(',').length) return ';';
  return ',';
}

function parseNumber(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const cleaned = v.replace(/\s/g, '').replace(',', '.').replace(/[^\d.\-]/g, '');
  if (!cleaned) return undefined;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : undefined;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[«»"']/g, '');
}

function findHeaderIndex(headers: string[], candidates: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    if (candidates.includes(headers[i])) return i;
  }
  return -1;
}

export default function ImportCsvModal({
  projectCategories,
  onClose,
  onImported,
}: {
  projectCategories: ProjectCategoryLite[];
  onClose: () => void;
  onImported: () => void;
}) {
  const addToast = useToastStore((st) => st.addToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [priceColumns, setPriceColumns] = useState<string[]>([]);
  const [unknownColumns, setUnknownColumns] = useState<string[]>([]);
  const [createCats, setCreateCats] = useState(true);
  const [createPCs, setCreatePCs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const knownPCNames = new Set(projectCategories.map((p) => p.name.trim().toLowerCase()));

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      // Detect delimiter from first non-empty line
      const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? '';
      const delim = detectDelimiter(firstLine);
      // parseCsv supports , ; \t — но первый раз заменим если delim это что-то конкретное
      // Однако parseCsv уже понимает все три, оставим как есть
      void delim;
      const grid = parseCsv(text);
      if (grid.length < 2) {
        addToast('error', 'CSV пустой или нет данных');
        return;
      }
      const headers = grid[0].map(normalizeHeader);
      const idxCategory = findHeaderIndex(headers, ['категория', 'категория прайса', 'раздел']);
      const idxName = findHeaderIndex(headers, ['название', 'наименование', 'услуга', 'работа', 'name']);
      const idxDescription = findHeaderIndex(headers, ['описание', 'комментарий', 'description']);
      const idxUnit = findHeaderIndex(headers, ['ед.', 'единица', 'единица измерения', 'ед. изм.', 'unit']);
      const idxCost = findHeaderIndex(headers, ['себест.', 'себестоимость', 'cost']);

      if (idxName === -1) {
        addToast('error', 'Не найдена колонка «Название». Проверьте заголовки CSV.');
        return;
      }

      // All other columns are treated as price columns
      const usedIdx = new Set([idxCategory, idxName, idxDescription, idxUnit, idxCost].filter((i) => i >= 0));
      const priceCols: { idx: number; name: string }[] = [];
      headers.forEach((h, i) => {
        if (usedIdx.has(i)) return;
        if (!h) return;
        // skip fixed-looking columns
        if (FIXED_HEADERS.includes(h)) return;
        priceCols.push({ idx: i, name: grid[0][i].trim() });
      });

      const unknown = priceCols.filter((c) => !knownPCNames.has(c.name.toLowerCase())).map((c) => c.name);

      const parsed: ParsedRow[] = [];
      for (let r = 1; r < grid.length; r++) {
        const cells = grid[r];
        const name = (idxName >= 0 ? cells[idxName] : '')?.trim() ?? '';
        if (!name) continue;
        const issues: string[] = [];
        const cost = idxCost >= 0 ? parseNumber(cells[idxCost]) : undefined;
        const prices: { projectCategoryName: string; price: number }[] = [];
        for (const pc of priceCols) {
          const v = parseNumber(cells[pc.idx]);
          if (v !== undefined) prices.push({ projectCategoryName: pc.name, price: v });
        }
        parsed.push({
          rowIdx: r + 1,
          categoryName: idxCategory >= 0 ? cells[idxCategory]?.trim() || undefined : undefined,
          name,
          description: idxDescription >= 0 ? cells[idxDescription]?.trim() || undefined : undefined,
          unit: idxUnit >= 0 ? cells[idxUnit]?.trim() || undefined : undefined,
          cost,
          prices,
          rawIssues: issues,
        });
      }

      if (parsed.length === 0) {
        addToast('error', 'Не нашлось ни одной строки с названием');
        return;
      }
      setPriceColumns(priceCols.map((c) => c.name));
      setUnknownColumns(unknown);
      setRows(parsed);
      setResult(null);
    } catch {
      addToast('error', 'Не удалось прочитать CSV-файл');
    }
  };

  const handleSubmit = async (dryRun: boolean) => {
    if (!rows) return;
    try {
      setSubmitting(true);
      const { data } = await api.post<ImportResult>('/price-list/import', {
        rows: rows.map((r) => ({
          name: r.name,
          categoryName: r.categoryName,
          description: r.description,
          unit: r.unit,
          cost: r.cost,
          prices: r.prices,
        })),
        dryRun,
        createMissingCategories: createCats,
        createMissingProjectCategories: createPCs,
      });
      setResult(data);
      if (!dryRun) {
        if (data.errors.length === 0) {
          addToast('success', `Импортировано: ${data.created}`);
          onImported();
        } else {
          addToast('error', `Импортировано: ${data.created}, ошибок: ${data.errors.length}`);
          onImported();
        }
      }
    } catch {
      addToast('error', 'Не удалось импортировать');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Импорт прайса из CSV</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {!rows && (
            <>
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Формат CSV</p>
                <p className="text-xs">
                  Заголовки первой строкой. Обязательная колонка — <code className="px-1 py-0.5 bg-white/50 dark:bg-black/30 rounded">Название</code>.
                  Опциональные: <code>Категория</code>, <code>Описание</code>, <code>Ед.</code>, <code>Себест.</code>.
                  Все остальные колонки воспринимаются как цены по категориям проектов (заголовок = имя категории проекта).
                </p>
                <p className="text-xs mt-2">
                  Разделители: <code>,</code> <code>;</code> <code>tab</code>. Десятичные — запятая или точка.
                </p>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="hidden"
              />
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-violet-400 hover:text-violet-500 transition-colors flex flex-col items-center gap-2"
              >
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5l3-3m0 0l3 3m-3-3v9m13.5-6V8.25a3 3 0 00-3-3h-7.687a2.25 2.25 0 01-1.414-.5L9.349 3.25A2.25 2.25 0 007.934 2.75H4.5a3 3 0 00-3 3v12a3 3 0 003 3h15a3 3 0 003-3v-3.75" />
                </svg>
                Выбрать CSV-файл
              </button>
            </>
          )}

          {rows && !result && (
            <>
              <div className="text-sm text-gray-700 dark:text-gray-200">
                Готово к импорту строк: <strong>{rows.length}</strong>
                {priceColumns.length > 0 && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    · колонок цен: {priceColumns.length}
                  </span>
                )}
              </div>

              {unknownColumns.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-medium mb-1">Незнакомые колонки цен</p>
                  <p className="text-xs">
                    Не найдены в категориях проектов: {unknownColumns.map((n) => `«${n}»`).join(', ')}.
                    Включите чекбокс ниже, чтобы создать их автоматически.
                  </p>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createCats}
                    onChange={(e) => setCreateCats(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-200">Создавать недостающие категории прайса</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createPCs}
                    onChange={(e) => setCreatePCs(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-200">Создавать недостающие колонки цен (категории проектов)</span>
                </label>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400">№</th>
                        <th className="text-left px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400">Категория</th>
                        <th className="text-left px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400">Название</th>
                        <th className="text-left px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400">Ед.</th>
                        <th className="text-right px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400">Себест.</th>
                        {priceColumns.map((pc) => (
                          <th key={pc} className="text-right px-2 py-1.5 font-medium text-violet-700 dark:text-violet-300 whitespace-nowrap">
                            {pc}
                            {!knownPCNames.has(pc.toLowerCase()) && <span className="ml-1 text-amber-500">⚠</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {rows.slice(0, 50).map((r) => (
                        <tr key={r.rowIdx}>
                          <td className="px-2 py-1 text-gray-400 dark:text-gray-500">{r.rowIdx}</td>
                          <td className="px-2 py-1 text-gray-600 dark:text-gray-300">{r.categoryName || '—'}</td>
                          <td className="px-2 py-1 text-gray-800 dark:text-gray-100 font-medium">{r.name}</td>
                          <td className="px-2 py-1 text-gray-600 dark:text-gray-300">{r.unit || ''}</td>
                          <td className="px-2 py-1 text-gray-600 dark:text-gray-300 text-right">{r.cost ?? ''}</td>
                          {priceColumns.map((pc) => {
                            const p = r.prices?.find((pp) => pp.projectCategoryName === pc);
                            return (
                              <td key={pc} className="px-2 py-1 text-gray-800 dark:text-gray-100 text-right">
                                {p ? p.price : ''}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 50 && (
                  <p className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/30">
                    Показаны первые 50 строк из {rows.length}
                  </p>
                )}
              </div>
            </>
          )}

          {result && (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg border ${result.errors.length === 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300'}`}>
                <p className="text-sm">
                  {result.dryRun ? 'Превью (не сохранено): ' : 'Импортировано: '}
                  <strong>{result.created}</strong> из {result.total}.
                  {result.skipped > 0 && <span> Пропущено: {result.skipped}.</span>}
                </p>
                {result.createdCategories.length > 0 && (
                  <p className="text-xs mt-1">Будут созданы категории прайса: {result.createdCategories.join(', ')}</p>
                )}
                {result.createdProjectCategories.length > 0 && (
                  <p className="text-xs mt-1">Будут созданы колонки цен: {result.createdProjectCategories.join(', ')}</p>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="border border-red-200 dark:border-red-500/30 rounded-lg max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-red-50 dark:bg-red-500/10 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1 font-medium text-red-700 dark:text-red-300">Строка</th>
                        <th className="text-left px-2 py-1 font-medium text-red-700 dark:text-red-300">Проблема</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100 dark:divide-red-500/20">
                      {result.errors.map((e, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1 text-red-600 dark:text-red-400">{e.row}</td>
                          <td className="px-2 py-1 text-gray-700 dark:text-gray-200">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center gap-2">
          <div>
            {rows && (
              <button
                onClick={() => { setRows(null); setResult(null); }}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                ← Другой файл
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              {result && !result.dryRun ? 'Закрыть' : 'Отмена'}
            </button>
            {rows && (!result || result.dryRun) && (
              <>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 disabled:opacity-50 rounded-lg"
                >
                  Превью
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
                >
                  {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Импортировать
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
