// Ведомость расходов по статье — список платежей direction=expense
// с фильтром по статье (Payment.category), сгруппированных по дате.

import {
  FONT,
  FONT_BOLD,
  clientDisplayName,
  fmtDateShort,
  fmtMoney,
  num,
  CompanyData,
  ClientData,
  ProjectData,
} from '../../estimates/pdf-templates/common';

export interface ExpenseRow {
  id: number;
  paymentDate: string;
  paymentNumber: string;
  description?: string | null;
  category?: string | null;
  subType?: string | null;
  counterparty?: string | null; // имя контрагента
  amount: number | string;
}

export interface ExpenseStatementCtx {
  company: CompanyData;
  client: ClientData | null;
  project: ProjectData;
  article: string;
  periodFrom?: string | null;
  periodTo?: string | null;
  rows: ExpenseRow[];
  docDate: string;
}

export function renderExpenseStatement(doc: any, ctx: ExpenseStatementCtx): void {
  const W = doc.page.width;
  const M = 40;
  const CW = W - M * 2;
  const { company, client, project, article, rows } = ctx;

  doc.fontSize(20).font(FONT_BOLD).fillColor('#1F2937')
    .text(`Ведомость расходов по статье: ${article}`, M, M, { width: CW });

  let y = doc.y + 4;
  doc.fontSize(10).font(FONT).fillColor('#6B7280')
    .text(`от ${fmtDateShort(ctx.docDate)}`, M, y);
  y += 20;

  // Проект + адрес
  doc.fontSize(11).font(FONT_BOLD).fillColor('#1F2937')
    .text('Проект', M, y);
  y += 16;
  doc.fontSize(11).font(FONT).fillColor('#1F2937')
    .text([project.code, project.name].filter(Boolean).join(' | '), M, y);
  y += 18;

  if (project.address) {
    doc.fontSize(10).font(FONT).fillColor('#6B7280')
      .text(project.address, M, y, { width: CW });
    y = doc.y + 4;
  }

  if (ctx.periodFrom || ctx.periodTo) {
    doc.fontSize(10).font(FONT).fillColor('#6B7280')
      .text(`Период: ${fmtDateShort(ctx.periodFrom)} — ${fmtDateShort(ctx.periodTo)}`, M, y);
    y += 16;
  }

  y += 10;

  // Подрядчик/Заказчик — в две колонки
  const COL_W = (CW - 20) / 2;
  doc.fontSize(12).font(FONT_BOLD).fillColor('#1F2937')
    .text('Подрядчик', M, y);
  doc.fontSize(12).font(FONT_BOLD).fillColor('#1F2937')
    .text('Заказчик', M + COL_W + 20, y);
  y += 18;

  const compName = company.legalForm ? `${company.legalForm} «${company.name}»` : company.name;
  const contractor: [string, string][] = [
    ['Наименование', compName],
    ['ИНН', company.inn || '—'],
    ['ОГРН', company.ogrn || '—'],
    ['Адрес', company.legalAddress || company.actualAddress || '—'],
    ['Телефон', company.phone || '—'],
  ];
  const customer: [string, string][] = client
    ? [
        ['Наименование', clientDisplayName(client) || '—'],
        ['ИНН', client.inn || '—'],
        ['Адрес', client.legalAddress || client.actualAddress || '—'],
        ['Телефон', client.phone || '—'],
      ]
    : [['', '']];

  const drawCol = (rows: [string, string][], x: number) => {
    let yy = y;
    for (const [label, value] of rows) {
      doc.fontSize(8).font(FONT_BOLD).fillColor('#6B7280')
        .text(label, x, yy, { width: COL_W });
      yy = doc.y + 1;
      doc.fontSize(9).font(FONT).fillColor('#111827')
        .text(value, x, yy, { width: COL_W });
      yy = doc.y + 4;
    }
    return yy;
  };
  const leftY = drawCol(contractor, M);
  const rightY = drawCol(customer, M + COL_W + 20);
  y = Math.max(leftY, rightY) + 10;

  // Таблица расходов
  const total = rows.reduce((s, r) => s + num(r.amount), 0);

  const COL_DATE = 70;
  const COL_NUM = 80;
  const COL_COUNTERPARTY = 160;
  const COL_AMOUNT = 110;
  const COL_DESC = CW - COL_DATE - COL_NUM - COL_COUNTERPARTY - COL_AMOUNT;

  if (y + 32 > doc.page.height - 60) {
    doc.addPage();
    y = M;
  }

  doc.rect(M, y, CW, 22).fill('#F3F4F6');
  doc.fontSize(9).font(FONT_BOLD).fillColor('#374151');
  let xx = M + 4;
  doc.text('Дата', xx, y + 6, { width: COL_DATE - 4 });
  xx += COL_DATE;
  doc.text('Документ', xx, y + 6, { width: COL_NUM - 4 });
  xx += COL_NUM;
  doc.text('Контрагент', xx, y + 6, { width: COL_COUNTERPARTY - 4 });
  xx += COL_COUNTERPARTY;
  doc.text('Описание', xx, y + 6, { width: COL_DESC - 4 });
  xx += COL_DESC;
  doc.text('Сумма, ₽', xx, y + 6, { width: COL_AMOUNT - 4, align: 'right' });
  y += 24;

  for (const row of rows) {
    const descLines = Math.max(1, Math.ceil((row.description?.length ?? 0) / 50));
    const rowH = Math.max(20, descLines * 12 + 6);
    if (y + rowH > doc.page.height - 100) {
      doc.addPage();
      y = M;
    }
    doc.rect(M, y, CW, rowH).strokeColor('#E5E7EB').stroke();
    xx = M + 4;
    doc.fontSize(9).font(FONT).fillColor('#111827')
      .text(fmtDateShort(row.paymentDate), xx, y + 4, { width: COL_DATE - 4 });
    xx += COL_DATE;
    doc.text(row.paymentNumber || '', xx, y + 4, { width: COL_NUM - 4 });
    xx += COL_NUM;
    doc.text(row.counterparty || '', xx, y + 4, { width: COL_COUNTERPARTY - 4 });
    xx += COL_COUNTERPARTY;
    doc.text(row.description || '', xx, y + 4, { width: COL_DESC - 4 });
    xx += COL_DESC;
    doc.font(FONT_BOLD).text(fmtMoney(row.amount), xx, y + 4, { width: COL_AMOUNT - 4, align: 'right' });
    y += rowH;
  }

  // Итог
  if (y + 30 > doc.page.height - 40) {
    doc.addPage();
    y = M;
  }
  y += 6;
  doc.moveTo(M + CW - 300, y).lineTo(W - M, y).strokeColor('#D1D5DB').stroke();
  y += 6;
  doc.fontSize(12).font(FONT_BOLD).fillColor('#1F2937')
    .text(`Итого по статье «${article}»`, M, y, { width: CW - 130 });
  doc.text(`${fmtMoney(total)} ₽`, M + CW - 130, y, { width: 130, align: 'right' });
}
