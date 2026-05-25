// Акт приёмки работ — упрощённый одностраничный документ.
// Шапка: название акта + номер/дата, проект, подрядчик, заказчик.
// Итоговая таблица: статья / сумма / НДС / итого.
// Подписи Сдал / Принял с М.П.

import {
  ExportContext,
  FONT,
  FONT_BOLD,
  clientDisplayName,
  fmtDate,
  fmtMoney,
  num,
} from './common';

export function renderAct(doc: any, ctx: ExportContext): void {
  const W = doc.page.width;
  const M = 50;
  const CW = W - M * 2;
  const { company, client, project, estimate } = ctx;

  doc.fontSize(20).font(FONT_BOLD).fillColor('#1F2937')
    .text(`Акт приёмки выполненных работ № ${estimate.docNumber || ''}`, M, M, { width: CW });

  let y = doc.y + 4;
  doc.fontSize(10).font(FONT).fillColor('#6B7280')
    .text(`от ${fmtDate(estimate.docDate)} г.`, M, y);
  y += 24;

  // Описание сторон
  const introParts: string[] = [];
  const compName = company.legalForm ? `${company.legalForm} «${company.name}»` : company.name;
  introParts.push(
    `${compName}${company.inn ? ` (ИНН ${company.inn})` : ''}, именуемое в дальнейшем «Подрядчик»,`,
    'с одной стороны, и',
    client
      ? `${clientDisplayName(client)}${client.inn ? ` (ИНН ${client.inn})` : ''}, именуемый в дальнейшем «Заказчик»,`
      : '____________________________________________________, именуемый в дальнейшем «Заказчик»,',
    'с другой стороны, составили настоящий Акт о нижеследующем:',
  );

  doc.fontSize(10).font(FONT).fillColor('#1F2937')
    .text(introParts.join(' '), M, y, { width: CW, align: 'justify', lineGap: 4 });
  y = doc.y + 12;

  // Body
  const projectLine = [project.code, project.name].filter(Boolean).join(' | ');
  doc.text(`1. Подрядчик выполнил работы по проекту: ${projectLine}.`, M, y, { width: CW });
  y = doc.y + 6;
  if (project.address) {
    doc.text(`2. Адрес объекта: ${project.address}.`, M, y, { width: CW });
    y = doc.y + 6;
  }
  if (estimate.periodFrom && estimate.periodTo) {
    doc.text(`3. Отчётный период: с ${fmtDate(estimate.periodFrom)} по ${fmtDate(estimate.periodTo)}.`, M, y, { width: CW });
    y = doc.y + 6;
  }
  doc.text(`4. Статья работ: ${estimate.article}.`, M, y, { width: CW });
  y = doc.y + 14;

  // Total table
  const subtotal = num(estimate.totalAmount);
  const markup = subtotal * (num(estimate.markupPercent) / 100);
  const total = subtotal + markup;

  doc.rect(M, y, CW, 22).fill('#F3F4F6');
  doc.fontSize(10).font(FONT_BOLD).fillColor('#374151')
    .text('Показатель', M + 10, y + 6, { width: CW - 220 })
    .text('Сумма, руб.', M + CW - 200, y + 6, { width: 180, align: 'right' });
  y += 24;

  const rows: [string, number, boolean][] = [
    [`Сумма по позициям («${estimate.article}»)`, subtotal, false],
    [`Наценка ${num(estimate.markupPercent)}%`, markup, false],
    ['ИТОГО к оплате', total, true],
  ];
  for (const [label, value, bold] of rows) {
    if (bold) {
      doc.moveTo(M, y).lineTo(W - M, y).strokeColor('#D1D5DB').stroke();
      y += 4;
    }
    doc.fontSize(bold ? 12 : 10).font(bold ? FONT_BOLD : FONT).fillColor('#1F2937')
      .text(label, M + 10, y + 2, { width: CW - 220 })
      .text(fmtMoney(value), M + CW - 200, y + 2, { width: 180, align: 'right' });
    y += bold ? 24 : 20;
  }

  y += 12;
  doc.fontSize(10).font(FONT).fillColor('#1F2937')
    .text(
      `5. Услуги оказаны Подрядчиком в полном объёме, с надлежащим качеством, в установленные сроки.`,
      M, y, { width: CW, lineGap: 4 },
    );
  y = doc.y + 6;
  doc.text('6. Стороны взаимных претензий по объёму, качеству и срокам выполненных работ не имеют.', M, y, { width: CW, lineGap: 4 });
  y = doc.y + 24;

  // Signatures
  const sigCol = (label: string, sigName: string, sigPos: string, x: number) => {
    doc.fontSize(11).font(FONT_BOLD).fillColor('#000').text(label, x, y);
    const sy = y + 18;
    doc.fontSize(9).font(FONT).text(sigPos || '________________', x, sy, { width: 160 });
    doc.fontSize(7).fillColor('#666').text('(должность)', x, sy + 12, { width: 160, align: 'center' });
    doc.moveTo(x + 170, sy + 10).lineTo(x + 240, sy + 10).strokeColor('#000').stroke();
    doc.fontSize(7).fillColor('#666').text('(подпись)', x + 170, sy + 12, { width: 70, align: 'center' });
    doc.fontSize(9).fillColor('#000').text(sigName || '________________', x + 250, sy, { width: 220 });
    doc.fontSize(7).fillColor('#666').text('(расшифровка подписи)', x + 250, sy + 12, { width: 220, align: 'center' });
    doc.fontSize(10).fillColor('#000').font(FONT_BOLD).text('М.П.', x, sy + 36);
  };

  if (y + 80 > doc.page.height - 40) {
    doc.addPage();
    y = M;
  }

  sigCol('Сдал (Подрядчик):', company.directorNameText || '', company.directorPosition || 'Директор', M);
  y += 76;
  sigCol('Принял (Заказчик):', client?.signatoryName || clientDisplayName(client) || '', client?.signatoryPosition || '', M);
}
