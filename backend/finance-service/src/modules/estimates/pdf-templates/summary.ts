// Сводный сметный расчёт — по образцу:
// ─ Шапка: название документа, дата, проект+адрес+координаты
// ─ Подрядчик/Заказчик в две колонки
// ─ Подписи
// ─ Итоговая таблица: Статья | Сумма за период, Наценка, Итого
// ─ Детализация: разделы (дата + статус «подтверждено заказчиком») с позициями

import {
  ExportContext,
  FONT,
  FONT_BOLD,
  clientDisplayName,
  fmtDateShort,
  fmtMoney,
  fmtQty,
  num,
} from './common';

export function renderSummary(doc: any, ctx: ExportContext): void {
  const W = doc.page.width;
  const M = 40;
  const CW = W - M * 2;
  const { company, client, project, estimate } = ctx;

  // ── Page 1 — реквизиты + итоги ──────────────────────────────────────
  doc.fontSize(22).font(FONT_BOLD).fillColor('#1F2937')
    .text('Сводный сметный расчёт', M, M);
  doc.fontSize(10).font(FONT).fillColor('#6B7280')
    .text(`от ${fmtDateShort(estimate.docDate ?? new Date())}`, M, M + 30);

  let y = M + 60;

  doc.fontSize(11).font(FONT_BOLD).fillColor('#1F2937')
    .text('Проект', M, y);
  y += 16;
  doc.fontSize(11).font(FONT).fillColor('#1F2937')
    .text([project.code, project.name].filter(Boolean).join(' | '), M, y);
  y += 18;

  if (project.address) {
    doc.fontSize(11).font(FONT_BOLD).fillColor('#1F2937')
      .text('Адрес', M, y);
    y += 16;
    doc.fontSize(11).font(FONT).fillColor('#1F2937')
      .text(project.address, M, y, { width: CW });
    y = doc.y + 4;
    if (project.coordinates && project.coordinates.lat && project.coordinates.lng) {
      doc.fontSize(10).fillColor('#6B7280')
        .text(`${project.coordinates.lat}, ${project.coordinates.lng}`, M, y);
      y += 16;
    }
  }

  y += 12;
  const COL_W = (CW - 20) / 2;

  // ── Подрядчик ──
  doc.fontSize(14).font(FONT_BOLD).fillColor('#1F2937')
    .text('Подрядчик', M, y);
  // ── Заказчик ──
  doc.fontSize(14).font(FONT_BOLD).fillColor('#1F2937')
    .text('Заказчик', M + COL_W + 20, y);

  let colY = y + 24;

  const fullName = company.legalForm ? `${company.legalForm} «${company.name}»` : company.name;
  const contractorRows: [string, string][] = [
    ['Наименование', fullName],
    ['ИНН', company.inn || '—'],
    ['ОГРН', company.ogrn || '—'],
    ['Адрес регистрации', company.legalAddress || company.actualAddress || '—'],
    ['Номер телефона', company.phone || '—'],
    ['Эл. почта', company.email || '—'],
    ['Наименование банка', company.bankName || '—'],
    ['БИК', company.bik || '—'],
    ['Расчётный счёт', company.settlementAccount || '—'],
    ['Корреспондентский счёт', company.correspondentAccount || '—'],
  ];

  const customerRows: [string, string][] = client
    ? [
        ['Наименование', clientDisplayName(client) || '—'],
        ['ИНН', client.inn || '—'],
        ['ОГРН', client.ogrn || '—'],
        ['Адрес регистрации', client.legalAddress || client.actualAddress || '—'],
        ['Номер телефона', client.phone || '—'],
        ['Эл. почта', client.email || '—'],
      ]
    : [];

  const drawColumn = (rows: [string, string][], x: number) => {
    let yy = colY;
    for (const [label, value] of rows) {
      doc.fontSize(9).font(FONT_BOLD).fillColor('#374151')
        .text(label, x, yy, { width: COL_W });
      yy = doc.y + 1;
      doc.fontSize(10).font(FONT).fillColor('#111827')
        .text(value, x, yy, { width: COL_W });
      yy = doc.y + 6;
    }
    return yy;
  };

  const leftBottom = drawColumn(contractorRows, M);
  const rightBottom = drawColumn(customerRows.length ? customerRows : [['', '']], M + COL_W + 20);

  y = Math.max(leftBottom, rightBottom) + 18;

  // Подписи
  doc.fontSize(10).font(FONT_BOLD).fillColor('#1F2937')
    .text('Подпись подрядчика ', M, y, { continued: true })
    .font(FONT).fillColor('#000')
    .text('_'.repeat(40));
  doc.font(FONT_BOLD).fillColor('#1F2937')
    .text('Подпись заказчика ', M + COL_W + 20, y, { continued: true })
    .font(FONT).fillColor('#000')
    .text('_'.repeat(40));

  y += 26;

  doc.fontSize(8).fillColor('#9CA3AF').font(FONT)
    .text('Внимание! Расчёт носит информационный характер и не является публичной офертой.', M, y, {
      width: CW,
    });

  y += 24;

  // ── Итоговая таблица: Статья | Сумма ─────────────────────────────
  const subtotal = num(estimate.totalAmount);
  const markup = subtotal * (num(estimate.markupPercent) / 100);
  const total = subtotal + markup;

  doc.rect(M, y, CW, 22).fill('#F3F4F6');
  doc.fontSize(10).font(FONT_BOLD).fillColor('#374151')
    .text('Статья расходов', M + 10, y + 6)
    .text('Сумма за период', M + CW - 200, y + 6, { width: 180, align: 'right' });
  y += 24;

  doc.fontSize(10).font(FONT).fillColor('#111827')
    .text(estimate.article, M + 10, y + 4)
    .text(fmtMoney(subtotal), M + CW - 200, y + 4, { width: 180, align: 'right' });
  y += 22;

  doc.fontSize(9).font(FONT_BOLD).fillColor('#1F2937')
    .text(`Наценка ${num(estimate.markupPercent)}%`, M + 10, y + 2)
    .font(FONT).fillColor('#111827')
    .text(fmtMoney(markup), M + CW - 200, y + 2, { width: 180, align: 'right' });
  y += 22;

  doc.moveTo(M, y).lineTo(W - M, y).strokeColor('#D1D5DB').lineWidth(1).stroke();
  y += 6;
  doc.fontSize(13).font(FONT_BOLD).fillColor('#1F2937')
    .text('Итого', M + 10, y + 2)
    .text(fmtMoney(total), M + CW - 200, y + 2, { width: 180, align: 'right' });

  // ── Page 2+ — детализация ────────────────────────────────────────
  if (estimate.sections.length === 0) return;

  doc.addPage();
  doc.fontSize(20).font(FONT_BOLD).fillColor('#1F2937')
    .text('Детализация статьи расходов:', M, M);
  doc.fontSize(14).font(FONT).fillColor('#111827')
    .text(estimate.article, M, M + 26);

  let dy = M + 60;

  // Table header
  doc.rect(M, dy, CW, 20).fill('#F3F4F6');
  doc.fontSize(9).font(FONT_BOLD).fillColor('#374151');
  const COL_DATE = 60;
  const COL_NAME = CW - COL_DATE - 60 - 60 - 90 - 100 - 110;
  const COL_QTY = 60;
  const COL_UNIT = 60;
  const COL_PRICE = 90;
  const COL_SUM = 100;
  const COL_TOTAL = 110;

  let xx = M + 4;
  doc.text('Дата', xx, dy + 6, { width: COL_DATE - 4 });
  xx += COL_DATE;
  doc.text('Наименование', xx, dy + 6, { width: COL_NAME - 4 });
  xx += COL_NAME;
  doc.text('Кол-во', xx, dy + 6, { width: COL_QTY - 4, align: 'right' });
  xx += COL_QTY;
  doc.text('Ед. изм', xx, dy + 6, { width: COL_UNIT - 4, align: 'center' });
  xx += COL_UNIT;
  doc.text('Цена за ед.', xx, dy + 6, { width: COL_PRICE - 4, align: 'right' });
  xx += COL_PRICE;
  doc.text('Сумма позиции', xx, dy + 6, { width: COL_SUM - 4, align: 'right' });
  xx += COL_SUM;
  doc.text('Сумма счёта', xx, dy + 6, { width: COL_TOTAL - 4, align: 'right' });
  dy += 22;

  for (const section of estimate.sections) {
    if (dy > doc.page.height - 80) {
      doc.addPage();
      dy = M;
    }

    // Section header row (Date | Title with status badge | sum)
    const sectionHeaderH = 36;
    doc.rect(M, dy, CW, sectionHeaderH).fill('#FBFBFD').strokeColor('#E5E7EB').stroke();
    doc.fontSize(9).font(FONT).fillColor('#6B7280')
      .text(fmtDateShort(section.sectionDate), M + 4, dy + 6, { width: COL_DATE - 4 });
    doc.fontSize(11).font(FONT_BOLD).fillColor('#1F2937')
      .text(section.name, M + COL_DATE + 4, dy + 4, {
        width: COL_NAME + COL_QTY + COL_UNIT + COL_PRICE + COL_SUM - 8,
      });
    if (section.status === 1) {
      doc.fontSize(8).font(FONT).fillColor('#10B981')
        .text('✓ Подтверждено заказчиком', M + COL_DATE + 4, dy + 22);
    } else {
      doc.fontSize(8).font(FONT).fillColor('#F59E0B')
        .text('Не подтверждено', M + COL_DATE + 4, dy + 22);
    }
    doc.fontSize(11).font(FONT_BOLD).fillColor('#1F2937')
      .text(fmtMoney(section.totalAmount), M + CW - COL_TOTAL, dy + 12, {
        width: COL_TOTAL - 4,
        align: 'right',
      });

    dy += sectionHeaderH;

    // Items
    for (const item of section.items) {
      const rowH = Math.max(20, estimateRowHeight(doc, item.name));
      if (dy + rowH > doc.page.height - 40) {
        doc.addPage();
        dy = M;
      }
      doc.rect(M, dy, CW, rowH).strokeColor('#F3F4F6').stroke();

      xx = M + COL_DATE + 4;
      doc.fontSize(9).font(FONT).fillColor('#111827')
        .text(item.name, xx, dy + 4, { width: COL_NAME - 4 });

      xx = M + COL_DATE + COL_NAME;
      doc.fontSize(9).font(FONT).fillColor('#111827')
        .text(fmtQty(item.quantity), xx, dy + 4, { width: COL_QTY - 4, align: 'right' });
      xx += COL_QTY;
      doc.text(item.unit || '', xx, dy + 4, { width: COL_UNIT - 4, align: 'center' });
      xx += COL_UNIT;
      doc.text(fmtMoney(item.unitPrice), xx, dy + 4, { width: COL_PRICE - 4, align: 'right' });
      xx += COL_PRICE;
      doc.text(fmtMoney(item.amount), xx, dy + 4, { width: COL_SUM - 4, align: 'right' });

      dy += rowH;
    }
  }

  // Final totals
  if (dy > doc.page.height - 100) {
    doc.addPage();
    dy = M;
  }
  dy += 14;
  doc.fontSize(10).font(FONT_BOLD).fillColor('#1F2937')
    .text('Сумма предварительных расчётов', M + CW - 400, dy, { width: 280 })
    .font(FONT)
    .text(fmtMoney(subtotal), M + CW - 110, dy, { width: 110, align: 'right' });
  dy += 18;
  doc.font(FONT_BOLD)
    .text(`Наценка ${num(estimate.markupPercent)}%`, M + CW - 400, dy, { width: 280 })
    .font(FONT)
    .text(fmtMoney(markup), M + CW - 110, dy, { width: 110, align: 'right' });
  dy += 18;
  doc.moveTo(M + CW - 400, dy).lineTo(W - M, dy).strokeColor('#D1D5DB').stroke();
  dy += 4;
  doc.fontSize(13).font(FONT_BOLD).fillColor('#1F2937')
    .text('Итого', M + CW - 400, dy, { width: 280 })
    .text(fmtMoney(total), M + CW - 110, dy, { width: 110, align: 'right' });
}

function estimateRowHeight(doc: any, text: string): number {
  const approx = text.length;
  const lines = Math.max(1, Math.ceil(approx / 80));
  return lines * 14 + 8;
}
