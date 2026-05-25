import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

import { PriceService } from './price.service';
import { PrismaService } from '../../database/prisma.service';

function resolveFontDir(): string {
  const candidates = [
    process.env.FONTS_DIR,
    path.join(process.cwd(), 'fonts'),
    '/usr/share/fonts/ttf-dejavu',
    '/usr/share/fonts/truetype/dejavu',
  ].filter(Boolean) as string[];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'DejaVuSans.ttf'))) return dir;
  }
  return candidates[candidates.length - 1];
}

const FONT_DIR = resolveFontDir();
const FONT = path.join(FONT_DIR, 'DejaVuSans.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');

function fmtMoney(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  const num = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(num)) return String(v);
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

interface PriceRow {
  itemId: number;
  isModifier: boolean;
  categoryName: string;
  name: string;
  description: string;
  unit: string;
  cost: string;
  priceByCategory: Record<number, string>;
}

@Injectable()
export class PriceExportService {
  constructor(
    private readonly priceService: PriceService,
    private readonly prisma: PrismaService,
  ) {}

  async generatePdf(accountId: number): Promise<Buffer> {
    const { rows, projectCategories, accountName } = await this.collectData(accountId);

    return await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;
      const M = 40;
      const CW = W - M * 2;

      // Header
      doc.rect(0, 0, W, 60).fill('#5B21B6');
      doc.fillColor('#FFFFFF').fontSize(18).font(FONT_BOLD).text('Прайс-лист', M, 16);
      doc.fontSize(10).font(FONT).text(accountName, M, 40);
      doc.fontSize(8).fillColor('#C4B5FD').text(
        new Date().toLocaleDateString('ru-RU'),
        W - 150, 24,
        { width: 110, align: 'right' },
      );
      doc.fillColor('#1F2937');

      let y = 76;

      if (projectCategories.length === 0) {
        doc.fontSize(10).font(FONT).text('Не настроены колонки цен.', M, y);
        doc.end();
        return;
      }

      // Column layout: Name | Unit | Cost | <price columns...>
      const fixedCols = [
        { key: 'name', label: 'Наименование', width: 0.32 },
        { key: 'unit', label: 'Ед.', width: 0.06 },
        { key: 'cost', label: 'Себест.', width: 0.08 },
      ];
      const priceColsRatio = (1 - fixedCols.reduce((s, c) => s + c.width, 0)) / projectCategories.length;
      const cols = [
        ...fixedCols.map((c) => ({ ...c, width: c.width * CW })),
        ...projectCategories.map((pc) => ({
          key: `p${pc.id}`,
          label: pc.name,
          width: priceColsRatio * CW,
        })),
      ];

      // Table header
      doc.rect(M, y, CW, 22).fill('#F3F4F6');
      let x = M;
      cols.forEach((c) => {
        doc.fontSize(8).font(FONT_BOLD).fillColor('#374151')
          .text(c.label, x + 4, y + 7, { width: c.width - 8, ellipsis: true });
        x += c.width;
      });
      y += 24;

      let lastCategory = '__INIT__';

      rows.forEach((row, idx) => {
        if (y > doc.page.height - 50) {
          doc.addPage({ layout: 'landscape' });
          y = 40;
        }

        // Category section header
        if (row.categoryName !== lastCategory) {
          doc.rect(M, y, CW, 18).fill('#EEF2FF');
          doc.fontSize(9).font(FONT_BOLD).fillColor('#4338CA')
            .text(row.categoryName, M + 6, y + 4, { width: CW - 12 });
          y += 20;
          lastCategory = row.categoryName;
        }

        if (idx % 2 === 0) {
          doc.rect(M, y, CW, 17).fill('#FBFBFD');
        }

        x = M;
        cols.forEach((c) => {
          let value = '';
          if (c.key === 'name') {
            value = row.isModifier ? `  └ ${row.name}` : row.name;
          } else if (c.key === 'unit') value = row.unit;
          else if (c.key === 'cost') value = row.cost;
          else if (c.key.startsWith('p')) {
            const pcId = Number(c.key.slice(1));
            value = row.priceByCategory[pcId] ?? '';
          }
          const align = c.key === 'name' ? 'left' : (c.key === 'unit' ? 'center' : 'right');
          doc.fontSize(8).font(FONT).fillColor('#1F2937')
            .text(value, x + 4, y + 4, {
              width: c.width - 8,
              ellipsis: true,
              align: align as 'left' | 'right' | 'center',
            });
          x += c.width;
        });
        doc.moveTo(M, y + 17).lineTo(W - M, y + 17).strokeColor('#E5E7EB').stroke();
        y += 17;
      });

      // Footer
      const fy = doc.page.height - 24;
      doc.fontSize(7).fillColor('#9CA3AF').font(FONT)
        .text(`Сформировано ${new Date().toLocaleString('ru-RU')}`, M, fy, {
          width: CW,
          align: 'center',
        });

      doc.end();
    });
  }

  async generateXlsx(accountId: number): Promise<Buffer> {
    const { rows, projectCategories, accountName } = await this.collectData(accountId);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'CRM System';
    wb.created = new Date();

    const ws = wb.addWorksheet('Прайс', {
      properties: { defaultRowHeight: 18 },
      views: [{ state: 'frozen', ySplit: 3 }],
    });

    // Title
    ws.mergeCells(1, 1, 1, 3 + projectCategories.length);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = `Прайс-лист — ${accountName}`;
    titleCell.font = { size: 14, bold: true, color: { argb: 'FF1F2937' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(1).height = 26;

    // Empty row
    ws.getRow(2).height = 6;

    // Header row
    const headers = ['Наименование', 'Ед.', 'Себест.', ...projectCategories.map((pc) => pc.name)];
    const headerRow = ws.getRow(3);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B21B6' } };
      cell.alignment = { horizontal: i === 0 ? 'left' : 'right', vertical: 'middle' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } } };
    });
    headerRow.height = 22;

    // Column widths
    ws.getColumn(1).width = 48;
    ws.getColumn(2).width = 8;
    ws.getColumn(3).width = 12;
    for (let i = 0; i < projectCategories.length; i++) {
      ws.getColumn(4 + i).width = Math.max(14, projectCategories[i].name.length + 2);
    }

    let lastCategory = '__INIT__';
    let rowIdx = 4;

    rows.forEach((row) => {
      if (row.categoryName !== lastCategory) {
        const r = ws.getRow(rowIdx);
        ws.mergeCells(rowIdx, 1, rowIdx, 3 + projectCategories.length);
        const c = r.getCell(1);
        c.value = row.categoryName;
        c.font = { bold: true, color: { argb: 'FF4338CA' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
        r.height = 18;
        rowIdx++;
        lastCategory = row.categoryName;
      }

      const r = ws.getRow(rowIdx);
      r.getCell(1).value = row.isModifier ? `   ↳ ${row.name}` : row.name;
      r.getCell(2).value = row.unit;
      r.getCell(3).value = row.cost === '' ? null : Number(row.cost.replace(/\s/g, '').replace(',', '.'));
      r.getCell(3).numFmt = '#,##0.00';
      r.getCell(2).alignment = { horizontal: 'center' };
      r.getCell(3).alignment = { horizontal: 'right' };

      projectCategories.forEach((pc, i) => {
        const c = r.getCell(4 + i);
        const v = row.priceByCategory[pc.id];
        c.value = v ? Number(v.replace(/\s/g, '').replace(',', '.')) : null;
        c.numFmt = '#,##0.00';
        c.alignment = { horizontal: 'right' };
      });

      if (row.isModifier) {
        r.font = { italic: true, color: { argb: 'FF6B7280' } };
      }
      rowIdx++;
    });

    const buffer = (await wb.xlsx.writeBuffer()) as unknown as Buffer;
    return buffer;
  }

  private async collectData(accountId: number) {
    const accountRow = await (this.prisma as { account: { findUnique: (a: object) => Promise<{ name?: string } | null> } }).account.findUnique({
      where: { id: accountId },
    });
    const accountName = accountRow?.name ?? `Компания #${accountId}`;
    const data = await this.priceService.getPriceList(accountId);

    const rows: PriceRow[] = [];
    const categories = data.categories as Array<{ id: number; name: string }>;
    const items = data.items as Array<Parameters<typeof buildRow>[0] & {
      categoryId: number | null;
      modifiers?: Array<Parameters<typeof buildRow>[0]>;
    }>;
    const projectCategories = data.projectCategories as Array<{ id: number; name: string }>;
    const categoryById = new Map(categories.map((c) => [c.id, c.name]));
    const pcIds = projectCategories.map((p) => p.id);

    for (const item of items) {
      const catName = item.categoryId ? categoryById.get(item.categoryId) ?? 'Без категории' : 'Без категории';
      rows.push(buildRow(item, catName, false, pcIds));
      for (const mod of item.modifiers ?? []) {
        rows.push(buildRow(mod, catName, true, pcIds));
      }
    }

    return { rows, projectCategories, accountName };
  }
}

function buildRow(
  item: {
    id: number;
    name: string;
    description?: string | null;
    unit?: string | null;
    cost?: number | string | null;
    prices: { projectCategoryId: number; price: number | string }[];
  },
  categoryName: string,
  isModifier: boolean,
  projectCategoryIds: number[],
): PriceRow {
  const priceByCategory: Record<number, string> = {};
  for (const id of projectCategoryIds) {
    const p = item.prices.find((pp) => pp.projectCategoryId === id);
    priceByCategory[id] = p ? fmtMoney(p.price) : '';
  }
  return {
    itemId: item.id,
    isModifier,
    categoryName,
    name: item.name,
    description: item.description ?? '',
    unit: item.unit ?? '',
    cost: item.cost != null ? fmtMoney(item.cost) : '',
    priceByCategory,
  };
}
