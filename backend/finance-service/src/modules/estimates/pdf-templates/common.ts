import * as fs from 'fs';
import * as path from 'path';

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
export const FONT = path.join(FONT_DIR, 'DejaVuSans.ttf');
export const FONT_BOLD = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');

export function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function fmtMoney(v: unknown): string {
  return num(v).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtQty(v: unknown): string {
  const n = num(v);
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function fmtDateShort(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`;
}

export interface CompanyData {
  name: string;
  legalForm?: string | null;
  inn?: string | null;
  kpp?: string | null;
  ogrn?: string | null;
  legalAddress?: string | null;
  actualAddress?: string | null;
  phone?: string | null;
  email?: string | null;
  directorNameText?: string | null;
  directorPosition?: string | null;
  accountantNameText?: string | null;
  accountantPosition?: string | null;
  bankName?: string | null;
  bik?: string | null;
  settlementAccount?: string | null;
  correspondentAccount?: string | null;
}

export interface ClientData {
  id?: number;
  clientType?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  companyName?: string | null;
  legalName?: string | null;
  inn?: string | null;
  kpp?: string | null;
  ogrn?: string | null;
  phone?: string | null;
  email?: string | null;
  legalAddress?: string | null;
  actualAddress?: string | null;
  signatoryName?: string | null;
  signatoryPosition?: string | null;
}

export interface ProjectData {
  id: number;
  name: string;
  code?: string | null;
  address?: string | null;
  coordinates?: { lat?: number; lng?: number } | null;
}

export interface ContractData {
  id: number;
  number: string;
  signedDate?: string | null;
}

export interface EstimateData {
  id: number;
  name: string;
  article: string;
  docNumber?: string | null;
  docDate?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  markupPercent: number | string;
  totalAmount: number | string;
  sections: Array<{
    id: number;
    name: string;
    sectionDate?: string | null;
    status: number;
    confirmedAt?: string | null;
    totalAmount: number | string;
    items: Array<{
      id: number;
      name: string;
      description?: string | null;
      unit?: string | null;
      quantity: number | string;
      unitPrice: number | string;
      amount: number | string;
    }>;
  }>;
}

export interface ExportContext {
  company: CompanyData;
  client: ClientData | null;
  project: ProjectData;
  contract: ContractData | null;
  estimate: EstimateData;
}

export function clientDisplayName(c: ClientData | null): string {
  if (!c) return '';
  if (c.companyName || c.legalName) return c.legalName || c.companyName || '';
  const parts = [c.lastName, c.firstName, c.middleName].filter(Boolean);
  return parts.join(' ');
}

export function clientFullLine(c: ClientData | null): string {
  if (!c) return '';
  const name = clientDisplayName(c);
  const parts: string[] = [name];
  if (c.inn) parts.push(`ИНН: ${c.inn}`);
  if (c.ogrn) parts.push(`ОГРН: ${c.ogrn}`);
  if (c.legalAddress || c.actualAddress) parts.push(c.legalAddress || c.actualAddress!);
  if (c.phone) parts.push(c.phone);
  return parts.join(', ');
}

export function companyFullLine(c: CompanyData): string {
  const fullName = c.legalForm ? `${c.legalForm} «${c.name}»` : c.name;
  const parts: string[] = [fullName];
  if (c.inn) parts.push(`ИНН: ${c.inn}`);
  if (c.ogrn) parts.push(`ОГРН: ${c.ogrn}`);
  if (c.legalAddress) parts.push(c.legalAddress);
  if (c.phone) parts.push(c.phone);
  return parts.join(', ');
}
