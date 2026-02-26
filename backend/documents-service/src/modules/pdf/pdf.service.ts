import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');
import { GeneratePdfDto } from './dto/generate-pdf.dto';

const PDF_DIR = path.join(process.cwd(), 'public', 'pdfs');

// DejaVu fonts — full Unicode/Cyrillic support
// Resolution order: FONTS_DIR env var → project-local fonts/ → Alpine ttf-dejavu package
function resolveFontDir(): string {
  const candidates = [
    process.env.FONTS_DIR,
    path.join(process.cwd(), 'fonts'),
    '/usr/share/fonts/ttf-dejavu',
    '/usr/share/fonts/truetype/dejavu',   // Debian/Ubuntu path
  ].filter(Boolean) as string[];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'DejaVuSans.ttf'))) return dir;
  }
  return candidates[candidates.length - 1]; // fall through; will error on first use
}

const FONT_DIR = resolveFontDir();
const FONT = path.join(FONT_DIR, 'DejaVuSans.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');

const ENTITY_TITLES: Record<string, string> = {
  projects: 'Проект',
  tasks: 'Задача',
  users: 'Пользователь',
  'construction-sites': 'Стройплощадка',
  clients: 'Клиент',
  materials: 'Материал',
  equipment: 'Оборудование',
  suppliers: 'Поставщик',
  payments: 'Платёж',
  budgets: 'Бюджет',
  salaries: 'Зарплата',
  bonuses: 'Бонус',
  attendance: 'Посещаемость',
  leaves: 'Отпуск',
  teams: 'Команда',
  inspections: 'Инспекция',
};

// Normalize slug: 'task' → 'tasks', 'project' → 'projects' (frontend sends plural slugs)
function normalizeSlug(entityType: string): string {
  const singularToPlural: Record<string, string> = {
    project: 'projects',
    task: 'tasks',
    user: 'users',
  };
  return singularToPlural[entityType] ?? entityType;
}

const STATUS_LABELS: Record<string, Record<number, string>> = {
  projects: { 0: 'Планирование', 1: 'Активный', 2: 'Приостановлен', 3: 'Завершён', 4: 'Отменён' },
  tasks: { 0: 'Новая', 1: 'В работе', 2: 'На проверке', 3: 'Завершена', 4: 'Отменена' },
  'construction-sites': { 0: 'Планирование', 1: 'Активная', 2: 'Приостановлена', 3: 'Завершена' },
  payments: { 0: 'Черновик', 1: 'Ожидает', 2: 'Оплачен', 3: 'Отменён' },
  leaves: { 0: 'Ожидает', 1: 'Одобрен', 2: 'Отклонён', 3: 'Отменён' },
  inspections: { 0: 'Запланирована', 1: 'В процессе', 2: 'Завершена', 3: 'Отменена' },
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
    const entityType = normalizeSlug(dto.entityType);
    const { entityId, entityData } = dto;
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
    const statusLabel = (v: unknown) => STATUS_LABELS[entityType]?.[Number(v)] ?? val(v);

    switch (entityType) {
      case 'projects':
        return [
          { label: 'ID', value: val(data.id) },
          { label: 'Название', value: val(data.name) },
          { label: 'Описание', value: val(data.description) },
          { label: 'Статус', value: statusLabel(data.status) },
          { label: 'Приоритет', value: PRIORITY_LABELS[Number(data.priority)] ?? val(data.priority) },
          { label: 'Бюджет', value: data.budget ? `${Number(data.budget).toLocaleString('ru-RU')} ₽` : '—' },
          { label: 'Дата начала', value: fmtDate(data.startDate) },
          { label: 'Плановое окончание', value: fmtDate(data.plannedEndDate) },
          { label: 'Фактическое окончание', value: fmtDate(data.actualEndDate) },
          { label: 'Клиент', value: val(data.clientName) },
          { label: 'Адрес', value: val(data.address) },
          { label: 'Создан', value: fmtDate(data.createdAt) },
        ];

      case 'tasks':
        return [
          { label: 'ID', value: val(data.id) },
          { label: 'Название', value: val(data.title) },
          { label: 'Описание', value: val(data.description) },
          { label: 'Проект', value: (data.project as any)?.name ?? val(data.projectId) },
          { label: 'Статус', value: statusLabel(data.status) },
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

      case 'users':
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
        // Auto-generate fields from data, skipping internal/object fields
        return Object.entries(data)
          .filter(([k, v]) =>
            !['deletedAt', 'passwordDigest', 'accountId', 'password_digest'].includes(k)
            && typeof v !== 'object',
          )
          .map(([k, v]) => {
            // Humanize common field names
            if (k === 'status') return { label: 'Статус', value: statusLabel(v) };
            if (k.endsWith('Date') || k.endsWith('_at') || k.endsWith('At')) return { label: k, value: fmtDate(v) };
            return { label: k, value: val(v) };
          });
    }
  }

  async generateListPdf(
    rawEntityType: string,
    rows: Record<string, unknown>[],
    title: string,
  ): Promise<{ filename: string; downloadUrl: string }> {
    const entityType = normalizeSlug(rawEntityType);
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
      const fields = this.getListFields(entityType, rows);
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

  private getListFields(entityType: string, rows?: Record<string, unknown>[]): { key: string; label: string; render?: (row: Record<string, unknown>) => string }[] {
    const statusRender = (r: Record<string, unknown>) => STATUS_LABELS[entityType]?.[Number(r.status)] ?? val(r.status);

    switch (entityType) {
      case 'projects':
        return [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Название' },
          { key: 'status', label: 'Статус', render: statusRender },
          { key: 'budget', label: 'Бюджет', render: (r) => r.budget ? `${Number(r.budget).toLocaleString('ru-RU')} ₽` : '—' },
          { key: 'startDate', label: 'Начало', render: (r) => fmtDate(r.startDate) },
          { key: 'plannedEndDate', label: 'Окончание', render: (r) => fmtDate(r.plannedEndDate) },
        ];
      case 'tasks':
        return [
          { key: 'id', label: 'ID' },
          { key: 'title', label: 'Название' },
          { key: 'status', label: 'Статус', render: statusRender },
          { key: 'priority', label: 'Приоритет', render: (r) => PRIORITY_LABELS[Number(r.priority)] ?? val(r.priority) },
          { key: 'assignees', label: 'Исполнители', render: (r) => Array.isArray(r.assignees) ? (r.assignees as any[]).map((a: any) => a.userName || `#${a.userId}`).join(', ') || '—' : '—' },
          { key: 'dueDate', label: 'Срок', render: (r) => fmtDate(r.dueDate) },
        ];
      case 'users':
        return [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Имя' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Телефон' },
          { key: 'isActive', label: 'Активен', render: (r) => r.isActive ? 'Да' : 'Нет' },
        ];
      case 'construction-sites':
        return [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Название' },
          { key: 'address', label: 'Адрес' },
          { key: 'status', label: 'Статус', render: statusRender },
          { key: 'startDate', label: 'Начало', render: (r) => fmtDate(r.startDate) },
        ];
      case 'clients':
        return [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Название' },
          { key: 'contactPerson', label: 'Контактное лицо' },
          { key: 'phone', label: 'Телефон' },
          { key: 'email', label: 'Email' },
        ];
      case 'materials':
        return [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Название' },
          { key: 'unit', label: 'Ед. изм.' },
          { key: 'quantity', label: 'Количество' },
          { key: 'price', label: 'Цена', render: (r) => r.price ? `${Number(r.price).toLocaleString('ru-RU')} ₽` : '—' },
        ];
      case 'equipment':
        return [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Название' },
          { key: 'inventoryNumber', label: 'Инв. номер' },
          { key: 'status', label: 'Статус', render: statusRender },
        ];
      case 'suppliers':
        return [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Название' },
          { key: 'contactPerson', label: 'Контактное лицо' },
          { key: 'phone', label: 'Телефон' },
          { key: 'email', label: 'Email' },
        ];
      case 'payments':
        return [
          { key: 'id', label: 'ID' },
          { key: 'description', label: 'Описание' },
          { key: 'amount', label: 'Сумма', render: (r) => r.amount ? `${Number(r.amount).toLocaleString('ru-RU')} ₽` : '—' },
          { key: 'status', label: 'Статус', render: statusRender },
          { key: 'paymentDate', label: 'Дата', render: (r) => fmtDate(r.paymentDate) },
        ];
      case 'salaries':
        return [
          { key: 'id', label: 'ID' },
          { key: 'employeeName', label: 'Сотрудник' },
          { key: 'totalAmount', label: 'Сумма', render: (r) => r.totalAmount ? `${Number(r.totalAmount).toLocaleString('ru-RU')} ₽` : '—' },
          { key: 'payrollPeriod', label: 'Период' },
          { key: 'status', label: 'Статус', render: statusRender },
        ];
      case 'attendance':
        return [
          { key: 'id', label: 'ID' },
          { key: 'employeeName', label: 'Сотрудник' },
          { key: 'date', label: 'Дата', render: (r) => fmtDate(r.date) },
          { key: 'checkIn', label: 'Приход' },
          { key: 'checkOut', label: 'Уход' },
          { key: 'hoursWorked', label: 'Часы' },
        ];
      case 'leaves':
        return [
          { key: 'id', label: 'ID' },
          { key: 'employeeName', label: 'Сотрудник' },
          { key: 'leaveType', label: 'Тип' },
          { key: 'startDate', label: 'С', render: (r) => fmtDate(r.startDate) },
          { key: 'endDate', label: 'По', render: (r) => fmtDate(r.endDate) },
          { key: 'status', label: 'Статус', render: statusRender },
        ];
      case 'teams':
        return [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Название' },
          { key: 'description', label: 'Описание' },
          { key: 'status', label: 'Статус', render: statusRender },
        ];
      case 'inspections':
        return [
          { key: 'id', label: 'ID' },
          { key: 'title', label: 'Название' },
          { key: 'status', label: 'Статус', render: statusRender },
          { key: 'inspectionDate', label: 'Дата', render: (r) => fmtDate(r.inspectionDate) },
        ];
      default: {
        // Auto-detect columns from first row, picking up to 6 scalar fields
        const sample = rows?.[0];
        if (!sample) return [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Название' }];
        const skipKeys = new Set(['deletedAt', 'passwordDigest', 'password_digest', 'accountId', 'account_id', 'updatedAt', 'updated_at']);
        const cols: { key: string; label: string; render?: (row: Record<string, unknown>) => string }[] = [];
        for (const [k, v] of Object.entries(sample)) {
          if (skipKeys.has(k)) continue;
          if (typeof v === 'object' && v !== null) continue;
          if (k.endsWith('Date') || k.endsWith('_at') || k.endsWith('At')) {
            cols.push({ key: k, label: k, render: (r) => fmtDate(r[k]) });
          } else {
            cols.push({ key: k, label: k });
          }
          if (cols.length >= 6) break;
        }
        return cols.length > 0 ? cols : [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Название' }];
      }
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
