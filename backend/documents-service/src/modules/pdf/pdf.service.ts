import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');
import { GeneratePdfDto } from './dto/generate-pdf.dto';

const PDF_DIR = path.join(process.cwd(), 'public', 'pdfs');

// DejaVu fonts — full Unicode/Cyrillic support, installed via ttf-dejavu in Alpine
const FONT_DIR = '/usr/share/fonts/ttf-dejavu';
const FONT = path.join(FONT_DIR, 'DejaVuSans.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');

const ENTITY_TITLES: Record<string, string> = {
  project: 'Проект',
  task: 'Задача',
  user: 'Пользователь',
};

const STATUS_LABELS: Record<string, Record<number, string>> = {
  project: { 0: 'Планирование', 1: 'Активный', 2: 'Приостановлен', 3: 'Завершён', 4: 'Отменён' },
  task: { 0: 'Новая', 1: 'Назначена', 2: 'В работе', 3: 'На проверке', 4: 'Завершена', 5: 'Отменена' },
};

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Низкий', 2: 'Средний', 3: 'Высокий', 4: 'Критический',
};

function fmtDate(v: unknown): string {
  if (!v) return '—';
  try {
    const d = new Date(v as string);
    if (isNaN(d.getTime())) return String(v);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  } catch {
    return String(v);
  }
}

function val(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Да' : 'Нет';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

@Injectable()
export class PdfService {
  constructor() {
    if (!fs.existsSync(PDF_DIR)) {
      fs.mkdirSync(PDF_DIR, { recursive: true });
    }
  }

  async generatePdf(dto: GeneratePdfDto): Promise<{ filename: string; downloadUrl: string }> {
    const { entityType, entityId, entityData } = dto;
    const timestamp = Date.now();
    const filename = `${entityType}-${entityId ?? timestamp}-${timestamp}.pdf`;
    const filepath = path.join(PDF_DIR, filename);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // ── Header ──────────────────────────────────────────────────
      doc
        .rect(0, 0, doc.page.width, 80)
        .fill('#5B21B6');

      doc
        .fillColor('#FFFFFF')
        .fontSize(22)
        .font(FONT_BOLD)
        .text('CRM System', 50, 22)
        .fontSize(12)
        .font(FONT)
        .text(ENTITY_TITLES[entityType] ?? entityType, 50, 50);

      doc.fillColor('#1F2937');

      // ── Title ────────────────────────────────────────────────────
      const titleY = 100;
      const titleText =
        (entityData.title as string) ||
        (entityData.name as string) ||
        `${ENTITY_TITLES[entityType] ?? entityType} #${entityId ?? ''}`;

      doc
        .fontSize(18)
        .font(FONT_BOLD)
        .text(titleText, 50, titleY, { width: doc.page.width - 100 });

      // ── Divider ──────────────────────────────────────────────────
      const afterTitle = doc.y + 10;
      doc.moveTo(50, afterTitle).lineTo(doc.page.width - 50, afterTitle).strokeColor('#E5E7EB').stroke();

      // ── Fields ───────────────────────────────────────────────────
      let y = afterTitle + 20;
      const fields = this.getFields(entityType, entityData);

      for (const { label, value } of fields) {
        if (y > doc.page.height - 100) {
          doc.addPage();
          y = 50;
        }

        // Label
        doc
          .fontSize(9)
          .font(FONT_BOLD)
          .fillColor('#6B7280')
          .text(label.toUpperCase(), 50, y, { width: 160 });

        // Value
        doc
          .fontSize(11)
          .font(FONT)
          .fillColor('#111827')
          .text(value, 220, y, { width: doc.page.width - 270 });

        y = Math.max(doc.y, y + 18) + 6;

        // Row separator
        doc.moveTo(50, y - 3).lineTo(doc.page.width - 50, y - 3).strokeColor('#F3F4F6').stroke();
      }

      // ── Footer ───────────────────────────────────────────────────
      const footerY = doc.page.height - 40;
      doc
        .moveTo(50, footerY - 5).lineTo(doc.page.width - 50, footerY - 5).strokeColor('#E5E7EB').stroke()
        .fontSize(8)
        .fillColor('#9CA3AF')
        .font(FONT)
        .text(
          `Сформировано: ${fmtDate(new Date().toISOString())}  |  Файл: ${filename}`,
          50,
          footerY,
          { width: doc.page.width - 100, align: 'center' },
        );

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return { filename, downloadUrl: `/pdf/download/${filename}` };
  }

  private getFields(
    entityType: string,
    data: Record<string, unknown>,
  ): { label: string; value: string }[] {
    switch (entityType) {
      case 'project':
        return [
          { label: 'ID', value: val(data.id) },
          { label: 'Название', value: val(data.name) },
          { label: 'Описание', value: val(data.description) },
          { label: 'Статус', value: STATUS_LABELS.project[Number(data.status)] ?? val(data.status) },
          { label: 'Приоритет', value: PRIORITY_LABELS[Number(data.priority)] ?? val(data.priority) },
          { label: 'Бюджет', value: data.budget ? `${Number(data.budget).toLocaleString('ru-RU')} ₽` : '—' },
          { label: 'Дата начала', value: fmtDate(data.startDate) },
          { label: 'Плановое окончание', value: fmtDate(data.plannedEndDate) },
          { label: 'Фактическое окончание', value: fmtDate(data.actualEndDate) },
          { label: 'Клиент', value: val(data.clientName) },
          { label: 'Адрес', value: val(data.address) },
          { label: 'Создан', value: fmtDate(data.createdAt) },
        ];

      case 'task':
        return [
          { label: 'ID', value: val(data.id) },
          { label: 'Название', value: val(data.title) },
          { label: 'Описание', value: val(data.description) },
          { label: 'Проект', value: (data.project as any)?.name ?? val(data.projectId) },
          { label: 'Статус', value: STATUS_LABELS.task[Number(data.status)] ?? val(data.status) },
          { label: 'Приоритет', value: PRIORITY_LABELS[Number(data.priority)] ?? val(data.priority) },
          { label: 'Тип', value: val(data.taskType) },
          {
            label: 'Исполнители',
            value: Array.isArray(data.assignees) && data.assignees.length > 0
              ? (data.assignees as any[]).map((a) => a.userName || `#${a.userId}`).join(', ')
              : '—',
          },
          { label: 'Дата начала', value: fmtDate(data.startDate) },
          { label: 'Срок', value: fmtDate(data.dueDate) },
          { label: 'Оценка (ч)', value: val(data.estimatedHours) },
          { label: 'Прогресс', value: data.progressPercentage != null ? `${data.progressPercentage}%` : '—' },
          { label: 'Создан', value: fmtDate(data.createdAt) },
        ];

      case 'user':
        return [
          { label: 'ID', value: val(data.id) },
          { label: 'Имя', value: val(data.name) },
          { label: 'Email', value: val(data.email) },
          { label: 'Телефон', value: val(data.phone) },
          { label: 'Активен', value: data.isActive ? 'Да' : 'Нет' },
          { label: 'Роль ID', value: val(data.roleId) },
          { label: 'Создан', value: fmtDate(data.createdAt) },
        ];

      default:
        return Object.entries(data)
          .filter(([k]) => !['deletedAt', 'passwordDigest'].includes(k))
          .map(([k, v]) => ({ label: k, value: val(v) }));
    }
  }

  async generateListPdf(
    entityType: string,
    rows: Record<string, unknown>[],
    title: string,
  ): Promise<{ filename: string; downloadUrl: string }> {
    const timestamp = Date.now();
    const filename = `${entityType}-list-${timestamp}.pdf`;
    const filepath = path.join(PDF_DIR, filename);

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // ── Header ────────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 70).fill('#5B21B6');
      doc
        .fillColor('#FFFFFF')
        .fontSize(20)
        .font(FONT_BOLD)
        .text('CRM System', 50, 18)
        .fontSize(11)
        .font(FONT)
        .text(title, 50, 44);
      doc.fillColor('#1F2937');

      // ── Subtitle ─────────────────────────────────────────────
      doc
        .fontSize(9)
        .fillColor('#6B7280')
        .text(
          `Записей: ${rows.length}  |  ${fmtDate(new Date().toISOString())}`,
          doc.page.width - 250,
          30,
          { width: 200, align: 'right' },
        );

      // ── Table header ─────────────────────────────────────────
      const fields = this.getListFields(entityType);
      const colWidth = Math.floor((doc.page.width - 100) / fields.length);
      let y = 90;

      doc.rect(50, y, doc.page.width - 100, 20).fill('#F3F4F6');
      fields.forEach((f, i) => {
        doc
          .fontSize(8)
          .font(FONT_BOLD)
          .fillColor('#374151')
          .text(f.label.toUpperCase(), 52 + i * colWidth, y + 5, { width: colWidth - 4 });
      });
      y += 22;

      // ── Rows ─────────────────────────────────────────────────
      rows.forEach((row, rowIdx) => {
        if (y > doc.page.height - 60) {
          doc.addPage({ layout: 'landscape' });
          y = 40;
        }
        if (rowIdx % 2 === 0) {
          doc.rect(50, y, doc.page.width - 100, 18).fill('#F9FAFB');
        }
        fields.forEach((f, i) => {
          const cellVal = f.render ? f.render(row) : val(row[f.key]);
          doc
            .fontSize(8)
            .font(FONT)
            .fillColor('#111827')
            .text(cellVal, 52 + i * colWidth, y + 4, { width: colWidth - 4, ellipsis: true });
        });
        // row border
        doc.moveTo(50, y + 18).lineTo(doc.page.width - 50, y + 18).strokeColor('#E5E7EB').stroke();
        y += 19;
      });

      // ── Footer ────────────────────────────────────────────────
      const footerY = doc.page.height - 30;
      doc
        .fontSize(7)
        .fillColor('#9CA3AF')
        .font(FONT)
        .text(`Файл: ${filename}`, 50, footerY, { width: doc.page.width - 100, align: 'center' });

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return { filename, downloadUrl: `/pdf/download/${filename}` };
  }

  private getListFields(entityType: string): { key: string; label: string; render?: (row: Record<string, unknown>) => string }[] {
    switch (entityType) {
      case 'project':
        return [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Название' },
          { key: 'status', label: 'Статус', render: (r) => STATUS_LABELS.project[Number(r.status)] ?? val(r.status) },
          { key: 'budget', label: 'Бюджет', render: (r) => r.budget ? `${Number(r.budget).toLocaleString('ru-RU')} ₽` : '—' },
          { key: 'startDate', label: 'Начало', render: (r) => fmtDate(r.startDate) },
          { key: 'plannedEndDate', label: 'Окончание', render: (r) => fmtDate(r.plannedEndDate) },
        ];
      case 'task':
        return [
          { key: 'id', label: 'ID' },
          { key: 'title', label: 'Название' },
          { key: 'status', label: 'Статус', render: (r) => STATUS_LABELS.task[Number(r.status)] ?? val(r.status) },
          { key: 'priority', label: 'Приоритет', render: (r) => PRIORITY_LABELS[Number(r.priority)] ?? val(r.priority) },
          { key: 'assignees', label: 'Исполнители', render: (r) => Array.isArray(r.assignees) ? (r.assignees as any[]).map((a) => a.userName || `#${a.userId}`).join(', ') || '—' : '—' },
          { key: 'dueDate', label: 'Срок', render: (r) => fmtDate(r.dueDate) },
        ];
      case 'user':
        return [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Имя' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Телефон' },
          { key: 'isActive', label: 'Активен', render: (r) => r.isActive ? 'Да' : 'Нет' },
        ];
      default:
        return [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Название' },
        ];
    }
  }

  streamPdf(filename: string): { stream: fs.ReadStream; size: number } {
    const filepath = path.join(PDF_DIR, filename);
    if (!fs.existsSync(filepath)) {
      throw new NotFoundException('Файл не найден');
    }
    const stat = fs.statSync(filepath);
    return { stream: fs.createReadStream(filepath), size: stat.size };
  }

  listPdfs(): string[] {
    if (!fs.existsSync(PDF_DIR)) return [];
    return fs.readdirSync(PDF_DIR).filter((f) => f.endsWith('.pdf'));
  }
}
