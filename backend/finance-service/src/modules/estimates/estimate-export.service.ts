import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');

import { EstimatesService } from './estimates.service';
import {
  CompanyData,
  ClientData,
  ContractData,
  ExportContext,
  EstimateData,
  ProjectData,
  FONT,
  FONT_BOLD,
} from './pdf-templates/common';
import { renderSummary } from './pdf-templates/summary';
import { renderKs2 } from './pdf-templates/ks2';
import { renderAct } from './pdf-templates/act';

export type EstimateExportFormat = 'summary' | 'ks2' | 'act';

@Injectable()
export class EstimateExportService {
  private readonly logger = new Logger(EstimateExportService.name);

  constructor(
    private readonly estimatesService: EstimatesService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async generate(
    accountId: number,
    estimateId: number,
    format: EstimateExportFormat,
    authToken: string | undefined,
  ): Promise<Buffer> {
    const ctx = await this.collectData(accountId, estimateId, authToken);
    return this.render(ctx, format);
  }

  private async collectData(
    accountId: number,
    estimateId: number,
    authToken: string | undefined,
  ): Promise<ExportContext> {
    const raw = await this.estimatesService.get(accountId, estimateId);
    if (!raw) throw new NotFoundException(`Estimate #${estimateId} not found`);

    const estimate: EstimateData = {
      id: raw.id,
      name: raw.name,
      article: raw.article,
      docNumber: raw.docNumber,
      docDate: raw.docDate,
      periodFrom: raw.periodFrom,
      periodTo: raw.periodTo,
      markupPercent: raw.markupPercent,
      totalAmount: raw.totalAmount,
      sections: (raw.sections ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        sectionDate: s.sectionDate,
        status: s.status,
        confirmedAt: s.confirmedAt,
        totalAmount: s.totalAmount,
        items: (s.items ?? []).map((it: any) => ({
          id: it.id,
          name: it.name,
          description: it.description,
          unit: it.unit,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          amount: it.amount,
        })),
      })),
    };

    const headers = this.authHeaders(authToken, accountId);
    const settingsUrl = this.configService.get<string>('services.settings');
    const projectsUrl = this.configService.get<string>('services.projects');
    const clientsUrl = this.configService.get<string>('services.clients');

    const [accountRow, bankRows, projectRow] = await Promise.all([
      this.safeGet<any>(`${settingsUrl}/system-settings`, headers),
      this.safeGet<any[]>(`${settingsUrl}/company-bank-accounts`, headers),
      this.safeGet<any>(`${projectsUrl}/projects/${raw.projectId}`, headers),
    ]);

    const firstBank = Array.isArray(bankRows) && bankRows.length > 0 ? bankRows[0] : null;

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
      directorNameText: accountRow?.directorNameText,
      directorPosition: accountRow?.directorPosition,
      accountantNameText: accountRow?.accountantNameText,
      accountantPosition: accountRow?.accountantPosition,
      bankName: firstBank?.bankName,
      bik: firstBank?.bik,
      settlementAccount: firstBank?.settlementAccount,
      correspondentAccount: firstBank?.correspondentAccount,
    };

    const project: ProjectData = projectRow
      ? {
          id: projectRow.id,
          name: projectRow.name,
          code: projectRow.code,
          address: projectRow.address,
          coordinates: projectRow.coordinates,
        }
      : { id: raw.projectId, name: '—' };

    let client: ClientData | null = null;
    const clientId = projectRow?.clientId;
    if (clientId) {
      const c = await this.safeGet<any>(`${clientsUrl}/clients/${clientId}`, headers);
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
          signatoryName: c.signatoryName,
          signatoryPosition: c.signatoryPosition,
        };
      }
    }

    let contract: ContractData | null = null;
    if (raw.contractId) {
      const cc = await (this.estimatesService as any).prisma?.contract?.findFirst?.({
        where: { id: raw.contractId, accountId },
      });
      if (cc) {
        contract = { id: cc.id, number: cc.number, signedDate: cc.signedDate };
      }
    }

    return { company, client, project, contract, estimate };
  }

  private render(ctx: ExportContext, format: EstimateExportFormat): Promise<Buffer> {
    const layout = format === 'ks2' ? 'landscape' : 'portrait';
    const doc = new PDFDocument({ size: 'A4', layout, margin: 40, bufferPages: true });
    doc.font(FONT);
    void FONT_BOLD;

    if (format === 'summary') renderSummary(doc, ctx);
    else if (format === 'ks2') renderKs2(doc, ctx);
    else if (format === 'act') renderAct(doc, ctx);
    else throw new BadRequestException(`Unknown format: ${format}`);

    addPageNumbers(doc);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
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
