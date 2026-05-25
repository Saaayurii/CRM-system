// Детализация баланса проекта — приходы (доходы от заказчика) и расходы,
// разбивка по статьям, баланс (приход - расход).

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

export interface BalanceRow {
  id: number;
  paymentDate: string;
  paymentNumber: string;
  description?: string | null;
  direction: 'income' | 'expense';
  category?: string | null;
  counterparty?: string | null;
  amount: number | string;
}

export interface BalanceDetailCtx {
  company: CompanyData;
  client: ClientData | null;
  project: ProjectData;
  rows: BalanceRow[];
  periodFrom?: string | null;
  periodTo?: string | null;
  docDate: string;
}

export function renderBalanceDetail(doc: any, ctx: BalanceDetailCtx): void {
  const W = doc.page.width;
  const M = 40;
  const CW = W - M * 2;
  const { company, client, project, rows } = ctx;

  // Заголовок
  doc.fontSize(20).font(FONT_BOLD).fillColor('#1F2937')
    .text('Детализация баланса', M, M);
  doc.fontSize(10).font(FONT).fillColor('#6B7280')
    .text(`от ${fmtDateShort(ctx.docDate)}`, M, M + 30);

  let y = M + 60;

  doc.fontSize(11).font(FONT_BOLD).fillColor('#1F2937').text('Проект', M, y);
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

  // Шапка подрядчик/заказчик
  const COL_W = (CW - 20) / 2;
  y += 10;
  doc.fontSize(12).font(FONT_BOLD).fillColor('#1F2937')
    .text('Подрядчик', M, y)
    .text('Заказчик', M + COL_W + 20, y);
  y += 18;

  const compName = company.legalForm ? `${company.legalForm} «${company.name}»` : company.name;
  doc.fontSize(9).font(FONT).fillColor('#111827')
    .text(`${compName}, ИНН ${company.inn || '—'}`, M, y, { width: COL_W });
  doc.text(client ? `${clientDisplayName(client)}${client.inn ? `, ИНН ${client.inn}` : ''}` : '—', M + COL_W + 20, y, { width: COL_W });
  y += 24;

  // Сводка
  const totalIncome = rows.filter((r) => r.direction === 'income').reduce((s, r) => s + num(r.amount), 0);
  const totalExpense = rows.filter((r) => r.direction === 'expense').reduce((s, r) => s + num(r.amount), 0);
  const balance = totalIncome - totalExpense;

  const summaryW = CW / 3 - 8;
  const drawSummary = (label: string, value: string, color: string, x: number) => {
    doc.rect(x, y, summaryW, 50).fill('#F9FAFB');
    doc.fontSize(8).font(FONT).fillColor('#6B7280')
      .text(label.toUpperCase(), x + 10, y + 8);
    doc.fontSize(15).font(FONT_BOLD).fillColor(color)
      .text(value, x + 10, y + 22, { width: summaryW - 20 });
  };
  drawSummary('Приход', `${fmtMoney(totalIncome)} ₽`, '#10B981', M);
  drawSummary('Расход', `${fmtMoney(totalExpense)} ₽`, '#EF4444', M + summaryW + 12);
  drawSummary('Баланс', `${fmtMoney(balance)} ₽`, balance >= 0 ? '#10B981' : '#EF4444', M + (summaryW + 12) * 2);
  y += 64;

  // Группировка по статьям (только расходы) для сводки по статьям
  const expenseByCategory = new Map<string, number>();
  for (const r of rows) {
    if (r.direction !== 'expense') continue;
    const key = r.category || 'Без статьи';
    expenseByCategory.set(key, (expenseByCategory.get(key) ?? 0) + num(r.amount));
  }
  if (expenseByCategory.size > 0) {
    if (y + 24 + expenseByCategory.size * 18 > doc.page.height - 80) {
      doc.addPage();
      y = M;
    }
    doc.fontSize(12).font(FONT_BOLD).fillColor('#1F2937')
      .text('Расходы по статьям', M, y);
    y += 18;
    doc.rect(M, y, CW, 20).fill('#F3F4F6');
    doc.fontSize(9).font(FONT_BOLD).fillColor('#374151')
      .text('Статья', M + 10, y + 6, { width: CW - 160 })
      .text('Сумма, ₽', M + CW - 150, y + 6, { width: 140, align: 'right' });
    y += 22;
    const sortedCats = Array.from(expenseByCategory.entries()).sort((a, b) => b[1] - a[1]);
    for (const [cat, sum] of sortedCats) {
      doc.rect(M, y, CW, 18).strokeColor('#E5E7EB').stroke();
      doc.fontSize(9).font(FONT).fillColor('#111827')
        .text(cat, M + 10, y + 4, { width: CW - 160 });
      doc.font(FONT_BOLD).text(fmtMoney(sum), M + CW - 150, y + 4, { width: 140, align: 'right' });
      y += 18;
    }
    y += 12;
  }

  // Полная детализация: все платежи
  if (y + 24 > doc.page.height - 80) {
    doc.addPage();
    y = M;
  }
  doc.fontSize(12).font(FONT_BOLD).fillColor('#1F2937')
    .text('Детализация платежей', M, y);
  y += 18;

  const COL_DATE = 70;
  const COL_TYPE = 70;
  const COL_NUM = 70;
  const COL_CATEGORY = 130;
  const COL_AMOUNT = 110;
  const COL_DESC = CW - COL_DATE - COL_TYPE - COL_NUM - COL_CATEGORY - COL_AMOUNT;

  doc.rect(M, y, CW, 22).fill('#F3F4F6');
  doc.fontSize(9).font(FONT_BOLD).fillColor('#374151');
  let xx = M + 4;
  doc.text('Дата', xx, y + 6, { width: COL_DATE - 4 });
  xx += COL_DATE;
  doc.text('Тип', xx, y + 6, { width: COL_TYPE - 4 });
  xx += COL_TYPE;
  doc.text('Документ', xx, y + 6, { width: COL_NUM - 4 });
  xx += COL_NUM;
  doc.text('Статья / Контрагент', xx, y + 6, { width: COL_CATEGORY - 4 });
  xx += COL_CATEGORY;
  doc.text('Описание', xx, y + 6, { width: COL_DESC - 4 });
  xx += COL_DESC;
  doc.text('Сумма, ₽', xx, y + 6, { width: COL_AMOUNT - 4, align: 'right' });
  y += 24;

  const sortedRows = [...rows].sort((a, b) => (a.paymentDate < b.paymentDate ? -1 : 1));
  for (const row of sortedRows) {
    const descLines = Math.max(1, Math.ceil((row.description?.length ?? 0) / 40));
    const rowH = Math.max(20, descLines * 12 + 6);
    if (y + rowH > doc.page.height - 60) {
      doc.addPage();
      y = M;
    }
    doc.rect(M, y, CW, rowH).strokeColor('#E5E7EB').stroke();
    xx = M + 4;
    doc.fontSize(9).font(FONT).fillColor('#111827')
      .text(fmtDateShort(row.paymentDate), xx, y + 4, { width: COL_DATE - 4 });
    xx += COL_DATE;
    const typeColor = row.direction === 'income' ? '#10B981' : '#EF4444';
    doc.fillColor(typeColor).text(row.direction === 'income' ? 'Приход' : 'Расход', xx, y + 4, { width: COL_TYPE - 4 });
    doc.fillColor('#111827');
    xx += COL_TYPE;
    doc.text(row.paymentNumber || '', xx, y + 4, { width: COL_NUM - 4 });
    xx += COL_NUM;
    const cat = [row.category, row.counterparty].filter(Boolean).join(' / ');
    doc.text(cat || '—', xx, y + 4, { width: COL_CATEGORY - 4 });
    xx += COL_CATEGORY;
    doc.text(row.description || '', xx, y + 4, { width: COL_DESC - 4 });
    xx += COL_DESC;
    doc.font(FONT_BOLD).fillColor(typeColor).text(fmtMoney(row.amount), xx, y + 4, { width: COL_AMOUNT - 4, align: 'right' });
    doc.font(FONT).fillColor('#111827');
    y += rowH;
  }
}
