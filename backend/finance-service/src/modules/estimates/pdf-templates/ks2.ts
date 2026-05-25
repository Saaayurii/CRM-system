// КС-2 — унифицированная форма по Постановлению Госкомстата №100 от 11.11.99
// Landscape A4. Шапка: Инвестор/Заказчик/Подрядчик с ОКПО, Стройка, Объект,
// Договор, Отчётный период. Таблица 8 колонок. Подписи Сдал/Принял с М.П.

import {
  ExportContext,
  FONT,
  FONT_BOLD,
  clientFullLine,
  companyFullLine,
  fmtDate,
  fmtMoney,
  fmtQty,
  num,
} from './common';

export function renderKs2(doc: any, ctx: ExportContext): void {
  const W = doc.page.width;
  const M = 30;
  const CW = W - M * 2;
  const { company, client, project, contract, estimate } = ctx;

  // ── Top-right meta ──────────────────────────────────────────────
  doc.fontSize(8).font(FONT).fillColor('#000');
  let topY = M;
  doc.text('Унифицированная форма № КС-2', M + CW - 220, topY, { width: 220, align: 'right' });
  doc.text('Утверждена постановлением Госкомстата России', M + CW - 220, topY + 10, {
    width: 220,
    align: 'right',
  });
  doc.text('от 11.11.99 № 100', M + CW - 220, topY + 20, { width: 220, align: 'right' });

  // Код / Форма по ОКУД
  const codeBoxX = M + CW - 110;
  const codeBoxY = M + 36;
  doc.rect(codeBoxX, codeBoxY, 110, 14).strokeColor('#000').stroke();
  doc.text('Код', codeBoxX + 50, codeBoxY + 3);
  doc.rect(codeBoxX, codeBoxY + 14, 110, 16).stroke();
  doc.text('Форма по ОКУД', codeBoxX - 80, codeBoxY + 18, { width: 80, align: 'right' });
  doc.text('0322005', codeBoxX + 5, codeBoxY + 18, { width: 100 });

  let y = codeBoxY + 32 + 6;

  // ── Информация о сторонах ────────────────────────────────────────
  const LBL_W = 130;
  const OKPO_W = 90;
  const drawPartyRow = (label: string, value: string, okpo?: string) => {
    doc.fontSize(9).font(FONT).fillColor('#000')
      .text(label, M, y, { width: LBL_W });
    const valX = M + LBL_W;
    const valW = CW - LBL_W - OKPO_W - 70;
    doc.text(value || '', valX, y, { width: valW });
    doc.moveTo(valX, y + 14).lineTo(valX + valW - 2, y + 14).strokeColor('#000').stroke();
    doc.fontSize(7).fillColor('#444')
      .text('(организация, адрес, телефон, факс)', valX, y + 16, { width: valW, align: 'center' });
    doc.fontSize(9).fillColor('#000')
      .text('по ОКПО', valX + valW + 2, y + 2, { width: 60 });
    doc.rect(valX + valW + 60, y, OKPO_W + 8, 18).strokeColor('#000').stroke();
    doc.text(okpo || '—', valX + valW + 60, y + 4, { width: OKPO_W + 8, align: 'center' });
    y += 30;
  };

  drawPartyRow('Инвестор', '', '—');
  drawPartyRow('Заказчик (Генподрядчик)', clientFullLine(client), client?.inn || '—');
  drawPartyRow('Подрядчик (Субподрядчик)', companyFullLine(company), company.inn || '—');

  // ── Stroyka / Object ────────────────────────────────────────────
  const stroykaParts = [
    project.code ? `${project.code} | ${project.name}` : project.name,
    project.address,
  ].filter(Boolean).join(', ');
  const stroykaText = project.coordinates && project.coordinates.lat && project.coordinates.lng
    ? `${stroykaParts} ${project.coordinates.lat}, ${project.coordinates.lng}`
    : stroykaParts;

  doc.fontSize(9).font(FONT).text('Стройка', M, y);
  doc.text(stroykaText, M + LBL_W, y, { width: CW - LBL_W });
  doc.moveTo(M + LBL_W, y + 14).lineTo(M + CW, y + 14).stroke();
  doc.fontSize(7).fillColor('#444')
    .text('(наименование, адрес)', M + LBL_W, y + 16, { width: CW - LBL_W, align: 'center' });
  y += 30;

  doc.fontSize(9).fillColor('#000').text('Объект', M, y);
  doc.moveTo(M + LBL_W, y + 14).lineTo(M + CW - 200, y + 14).stroke();
  doc.fontSize(7).fillColor('#444')
    .text('(наименование)', M + LBL_W, y + 16, { width: CW - LBL_W - 200, align: 'center' });
  doc.fontSize(9).fillColor('#000')
    .text('Вид деятельности по ОКДП', M + CW - 200, y + 4, { width: 130 });
  doc.rect(M + CW - 70, y, 70, 18).stroke();
  y += 30;

  // Договор подряда
  doc.fontSize(9).text('Договор подряда (контракт)', M + CW - 280, y, { width: 130 });
  doc.rect(M + CW - 150, y, 50, 18).stroke();
  doc.text('номер', M + CW - 145, y + 4, { width: 40 });
  doc.rect(M + CW - 100, y, 100, 18).stroke();
  doc.text(contract?.number || 'Б/Н', M + CW - 95, y + 4, { width: 90 });
  y += 20;
  doc.rect(M + CW - 150, y, 50, 18).stroke();
  doc.text('дата', M + CW - 145, y + 4, { width: 40 });
  doc.rect(M + CW - 100, y, 100, 18).stroke();
  const d = contract?.signedDate ? new Date(contract.signedDate) : (estimate.docDate ? new Date(estimate.docDate) : null);
  if (d && !Number.isNaN(d.getTime())) {
    doc.text(String(d.getDate()).padStart(2, '0'), M + CW - 95, y + 4, { width: 25 });
    doc.text(String(d.getMonth() + 1).padStart(2, '0'), M + CW - 65, y + 4, { width: 25 });
    doc.text(String(d.getFullYear()), M + CW - 40, y + 4, { width: 40 });
  }
  y += 24;

  // Вид операции
  doc.fontSize(9).text('Вид операции', M + CW - 280, y);
  doc.rect(M + CW - 100, y - 4, 100, 18).stroke();
  y += 18;

  // ── АКТ — header table ──────────────────────────────────────────
  const actX = M + 100;
  const actW = CW - 260;
  const colW = actW / 3;

  doc.fontSize(11).font(FONT_BOLD).text('АКТ', M + 20, y + 18);
  doc.fontSize(8).font(FONT)
    .text('Номер документа', actX, y, { width: colW, align: 'center' })
    .text('Дата составления', actX + colW, y, { width: colW, align: 'center' });
  doc.text('Отчётный период', actX + colW * 2, y, { width: colW, align: 'center' });
  doc.fontSize(7)
    .text('с', actX + colW * 2, y + 10, { width: colW / 2, align: 'center' })
    .text('по', actX + colW * 2 + colW / 2, y + 10, { width: colW / 2, align: 'center' });

  doc.rect(actX, y + 20, colW, 20).stroke();
  doc.rect(actX + colW, y + 20, colW, 20).stroke();
  doc.rect(actX + colW * 2, y + 20, colW / 2, 20).stroke();
  doc.rect(actX + colW * 2 + colW / 2, y + 20, colW / 2, 20).stroke();

  doc.fontSize(10).font(FONT)
    .text(estimate.docNumber || '—', actX, y + 24, { width: colW, align: 'center' })
    .text(fmtDate(estimate.docDate), actX + colW, y + 24, { width: colW, align: 'center' })
    .text(fmtDate(estimate.periodFrom), actX + colW * 2, y + 24, { width: colW / 2, align: 'center' })
    .text(fmtDate(estimate.periodTo), actX + colW * 2 + colW / 2, y + 24, { width: colW / 2, align: 'center' });

  y += 44;

  doc.fontSize(11).font(FONT_BOLD).fillColor('#000')
    .text('О ПРИЁМКЕ ВЫПОЛНЕННЫХ РАБОТ', M, y, { width: CW, align: 'center' });
  y += 18;

  doc.fontSize(9).font(FONT)
    .text('Сметная (договорная) стоимость в соответствии с договором подряда (субподряда)', M, y);
  doc.moveTo(M + 350, y + 10).lineTo(M + CW - 30, y + 10).stroke();
  doc.text('руб.', M + CW - 30, y);
  y += 20;

  // ── Таблица позиций ─────────────────────────────────────────────
  const TBL_COLS = [
    { label: 'Номер', subLabel: 'по порядку', w: 50 },
    { label: '', subLabel: 'позиции по смете', w: 70 },
    { label: 'Наименование работ', subLabel: '', w: 0 }, // 0 = expand
    { label: 'Номер единичной расценки', subLabel: '', w: 80 },
    { label: 'Единица измерения', subLabel: '', w: 60 },
    { label: 'Выполнено работ', subLabel: 'количество', w: 60 },
    { label: '', subLabel: 'цена за единицу, руб.', w: 80 },
    { label: '', subLabel: 'стоимость, руб.', w: 90 },
  ];
  const fixedSum = TBL_COLS.reduce((s, c) => s + c.w, 0);
  const expandCol = TBL_COLS.find((c) => c.w === 0)!;
  expandCol.w = CW - fixedSum;

  // Header
  const HEADER_H = 40;
  doc.rect(M, y, CW, HEADER_H).strokeColor('#000').stroke();
  let cx = M;
  for (const c of TBL_COLS) {
    doc.rect(cx, y, c.w, HEADER_H).stroke();
    doc.fontSize(7).font(FONT_BOLD).fillColor('#000')
      .text(c.label, cx + 2, y + 4, { width: c.w - 4, align: 'center' });
    doc.text(c.subLabel, cx + 2, y + 22, { width: c.w - 4, align: 'center' });
    cx += c.w;
  }
  y += HEADER_H;

  // Numbered row 1..8
  const NUMS_H = 12;
  doc.rect(M, y, CW, NUMS_H).stroke();
  cx = M;
  for (let i = 0; i < TBL_COLS.length; i++) {
    doc.rect(cx, y, TBL_COLS[i].w, NUMS_H).stroke();
    doc.fontSize(8).font(FONT).text(String(i + 1), cx + 2, y + 2, { width: TBL_COLS[i].w - 4, align: 'center' });
    cx += TBL_COLS[i].w;
  }
  y += NUMS_H;

  // Rows
  let totalQty = 0;
  let totalSum = 0;
  let posIdx = 0;
  let sectionIdx = 0;

  const drawRow = (cells: string[], height: number, isHeader = false) => {
    if (y + height > doc.page.height - 100) {
      doc.addPage({ layout: 'landscape', size: 'A4' });
      y = M;
    }
    cx = M;
    for (let i = 0; i < TBL_COLS.length; i++) {
      doc.rect(cx, y, TBL_COLS[i].w, height).strokeColor('#000').stroke();
      cx += TBL_COLS[i].w;
    }
    if (isHeader) {
      doc.fontSize(9).font(FONT_BOLD).fillColor('#000')
        .text(cells[2] || '', M + TBL_COLS[0].w + TBL_COLS[1].w + 2, y + 4, {
          width: CW - TBL_COLS[0].w - TBL_COLS[1].w - 4,
        });
    } else {
      cx = M;
      const aligns: ('left' | 'center' | 'right')[] = ['center', 'center', 'left', 'center', 'center', 'right', 'right', 'right'];
      for (let i = 0; i < TBL_COLS.length; i++) {
        doc.fontSize(8).font(FONT).fillColor('#000')
          .text(cells[i] || '', cx + 2, y + 3, { width: TBL_COLS[i].w - 4, align: aligns[i] });
        cx += TBL_COLS[i].w;
      }
    }
    y += height;
  };

  for (const section of estimate.sections) {
    sectionIdx++;
    drawRow(['', '', `${sectionIdx}. ${section.name}`, '', '', '', '', ''], 16, true);

    for (const item of section.items) {
      posIdx++;
      const qty = num(item.quantity);
      const price = num(item.unitPrice);
      const sum = num(item.amount);
      totalQty += qty;
      totalSum += sum;
      const nameLines = Math.max(1, Math.ceil((item.name?.length ?? 0) / 60));
      const rowH = Math.max(20, nameLines * 11 + 8);
      drawRow(
        [
          String(posIdx),
          '—',
          item.name,
          '—',
          item.unit || '',
          fmtQty(qty),
          fmtMoney(price),
          fmtMoney(sum),
        ],
        rowH,
      );
    }
  }

  // Footer row "Итого"
  if (y + 20 > doc.page.height - 100) {
    doc.addPage({ layout: 'landscape', size: 'A4' });
    y = M;
  }
  doc.rect(M, y, CW, 20).stroke();
  cx = M;
  for (const c of TBL_COLS) {
    doc.rect(cx, y, c.w, 20).stroke();
    cx += c.w;
  }
  const itogoX = M + TBL_COLS[0].w + TBL_COLS[1].w + TBL_COLS[2].w + TBL_COLS[3].w + TBL_COLS[4].w;
  doc.fontSize(9).font(FONT_BOLD)
    .text('Итого', itogoX - 60, y + 5, { width: 60, align: 'right' });
  doc.text(fmtQty(totalQty), itogoX, y + 5, { width: TBL_COLS[5].w - 4, align: 'right' });
  doc.text('Х', itogoX + TBL_COLS[5].w, y + 5, { width: TBL_COLS[6].w - 4, align: 'center' });
  doc.text(fmtMoney(totalSum), itogoX + TBL_COLS[5].w + TBL_COLS[6].w, y + 5, {
    width: TBL_COLS[7].w - 4,
    align: 'right',
  });
  y += 28;

  // Подписи
  if (y + 80 > doc.page.height - 30) {
    doc.addPage({ layout: 'landscape', size: 'A4' });
    y = M;
  }

  const sigCol = (label: string, sigName: string, sigPos: string, x: number) => {
    doc.fontSize(11).font(FONT_BOLD).fillColor('#000').text(label, x, y);
    let sy = y + 18;
    doc.fontSize(9).font(FONT).text(sigPos || '_______', x, sy, { width: 140 });
    doc.fontSize(7).fillColor('#666').text('(должность)', x, sy + 12, { width: 140, align: 'center' });
    doc.moveTo(x + 150, sy + 10).lineTo(x + 230, sy + 10).strokeColor('#000').stroke();
    doc.fontSize(7).fillColor('#666').text('(подпись)', x + 150, sy + 12, { width: 80, align: 'center' });
    doc.fontSize(9).fillColor('#000').text(sigName || '', x + 240, sy, { width: 200 });
    doc.fontSize(7).fillColor('#666').text('(расшифровка подписи)', x + 240, sy + 12, { width: 200, align: 'center' });
    doc.fontSize(10).fillColor('#000').font(FONT_BOLD).text('М.П.', x, sy + 32);
  };

  sigCol('Сдал', company.directorNameText || '', company.directorPosition || 'Директор', M);
  sigCol('Принял', client?.signatoryName || '', client?.signatoryPosition || '', M + CW / 2 + 10);

  // Агентское вознаграждение
  y += 110;
  const subtotal = num(estimate.totalAmount);
  const markup = subtotal * (num(estimate.markupPercent) / 100);
  if (markup > 0) {
    if (y > doc.page.height - 60) {
      doc.addPage({ layout: 'landscape', size: 'A4' });
      y = M;
    }
    doc.fontSize(9).font(FONT).fillColor('#000')
      .text(
        `Агентское вознаграждение Подрядчика за выполненные работы (наценка по статье ${estimate.article}) составляет ${fmtMoney(markup)} рублей.`,
        M, y, { width: CW },
      );
    y += 30;
    doc.text('Агентские услуги оказаны Подрядчиком в полном объёме, с надлежащим качеством, в установленные сроки.', M, y, { width: CW });
  }
}
