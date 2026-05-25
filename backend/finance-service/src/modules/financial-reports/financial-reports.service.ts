import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

import { PrismaService } from '../../database/prisma.service';
import {
  CompanyData,
  ClientData,
  ProjectData,
  FONT,
} from '../estimates/pdf-templates/common';
import {
  renderExpenseStatement,
  ExpenseRow,
} from './pdf-templates/expense-statement';
import {
  renderBalanceDetail,
  BalanceRow,
} from './pdf-templates/balance-detail';

export type FinancialReportFormat = 'expense-statement' | 'balance-detail';

@Injectable()
export class FinancialReportsService {
  private readonly logger = new Logger(FinancialReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async generate(
    accountId: number,
    projectId: number,
    format: FinancialReportFormat,
    options: { article?: string; periodFrom?: string; periodTo?: string },
    authToken: string | undefined,
  ): Promise<Buffer> {
    const meta = await this.collectMeta(accountId, projectId, authToken);
    const payments = await this.fetchPayments(accountId, projectId, options);
    return this.render(meta, payments, format, options);
  }

  private async collectMeta(
    accountId: number,
    projectId: number,
    authToken: string | undefined,
  ): Promise<{ company: CompanyData; client: ClientData | null; project: ProjectData }> {
    const headers = this.authHeaders(authToken, accountId);
    const settingsUrl = this.configService.get<string>('services.settings');
    const projectsUrl = this.configService.get<string>('services.projects');
    const clientsUrl = this.configService.get<string>('services.clients');

    const [accountRow, projectRow] = await Promise.all([
      this.safeGet<any>(`${settingsUrl}/system-settings`, headers),
      this.safeGet<any>(`${projectsUrl}/projects/${projectId}`, headers),
    ]);
    if (!projectRow) throw new NotFoundException(`Project #${projectId} not found`);

    const company: CompanyData = {
      name: accountRow?.name ?? 'Компания',
      legalForm: accountRow?.legalForm,
      inn: accountRow?.inn,
      kpp: accountRow?.kpp,
      ogrn: accountRow?.ogrn,
      legalAddress: accountRow?.legalAddress,
      actualAddress: accountRow?.actualAddress,
      phone: accountRow?.phone,
      email: accountRow?.email,
    };
    const project: ProjectData = {
      id: projectRow.id,
      name: projectRow.name,
      code: projectRow.code,
      address: projectRow.address,
      coordinates: projectRow.coordinates,
    };
    let client: ClientData | null = null;
    if (projectRow.clientId) {
      const c = await this.safeGet<any>(`${clientsUrl}/clients/${projectRow.clientId}`, headers);
      if (c) {
        client = {
          id: c.id,
          clientType: c.clientType,
          firstName: c.firstName,
          lastName: c.lastName,
          middleName: c.middleName,
          companyName: c.companyName,
          legalName: c.legalName,
          inn: c.inn,
          kpp: c.kpp,
          ogrn: c.ogrn,
          phone: c.phone,
          email: c.email,
          legalAddress: c.legalAddress,
          actualAddress: c.actualAddress,
        };
      }
    }
    return { company, client, project };
  }

  private async fetchPayments(
    accountId: number,
    projectId: number,
    options: { article?: string; periodFrom?: string; periodTo?: string },
  ): Promise<any[]> {
    const where: Record<string, unknown> = { accountId, projectId };
    if (options.article) where.category = options.article;
    if (options.periodFrom || options.periodTo) {
      where.paymentDate = {
        ...(options.periodFrom ? { gte: new Date(options.periodFrom) } : {}),
        ...(options.periodTo ? { lte: new Date(options.periodTo) } : {}),
      };
    }
    return (this.prisma as any).payment.findMany({
      where,
      orderBy: { paymentDate: 'asc' },
    });
  }

  private async render(
    meta: { company: CompanyData; client: ClientData | null; project: ProjectData },
    payments: any[],
    format: FinancialReportFormat,
    options: { article?: string; periodFrom?: string; periodTo?: string },
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    doc.font(FONT);

    if (format === 'expense-statement') {
      const rows: ExpenseRow[] = payments
        .filter((p) => p.direction === 'expense')
        .map((p) => ({
          id: p.id,
          paymentDate: p.paymentDate,
          paymentNumber: p.paymentNumber,
          description: p.description,
          category: p.category,
          subType: p.subType,
          counterparty: p.bankName || p.cashLocation || undefined,
          amount: p.amount,
        }));
      renderExpenseStatement(doc, {
        ...meta,
        article: options.article ?? 'Все статьи',
        periodFrom: options.periodFrom,
        periodTo: options.periodTo,
        rows,
        docDate: new Date().toISOString(),
      });
    } else {
      const rows: BalanceRow[] = payments.map((p) => ({
        id: p.id,
        paymentDate: p.paymentDate,
        paymentNumber: p.paymentNumber,
        description: p.description,
        direction: p.direction === 'income' ? 'income' : 'expense',
        category: p.category,
        counterparty: p.bankName || p.cashLocation || undefined,
        amount: p.amount,
      }));
      renderBalanceDetail(doc, {
        ...meta,
        rows,
        periodFrom: options.periodFrom,
        periodTo: options.periodTo,
        docDate: new Date().toISOString(),
      });
    }

    addPageNumbers(doc);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  async listExpenseArticles(accountId: number, projectId: number): Promise<string[]> {
    const rows: { category: string | null }[] = await (this.prisma as any).payment.findMany({
      where: { accountId, projectId, direction: 'expense' },
      select: { category: true },
      distinct: ['category'],
    });
    return rows
      .map((r) => r.category)
      .filter((c): c is string => Boolean(c && c.trim()));
  }

  private authHeaders(authToken: string | undefined, accountId: number): Record<string, string> {
    const h: Record<string, string> = { 'x-account-id': String(accountId) };
    if (authToken) h['authorization'] = authToken;
    return h;
  }

  private async safeGet<T>(url: string, headers: Record<string, string>): Promise<T | null> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<T>(url, { headers, timeout: 10000 }),
      );
      return res.data;
    } catch (err) {
      const message = (err as { message?: string })?.message ?? String(err);
      this.logger.warn(`safeGet ${url} failed: ${message}`);
      return null;
    }
  }
}

function addPageNumbers(doc: any): void {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottomY = doc.page.height - 24;
    doc.fontSize(8).fillColor('#9CA3AF')
      .text(
        `Страница ${i + 1} из ${range.count}`,
        40,
        bottomY,
        { width: doc.page.width - 80, align: 'center', lineBreak: false },
      );
  }
}
