import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateCompanyBankAccountDto,
  UpdateCompanyBankAccountDto,
} from './dto/upsert-company-bank-account.dto';

@Injectable()
export class CompanyBankAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  list(accountId: number) {
    return (this.prisma as any).companyBankAccount.findMany({
      where: { accountId },
      orderBy: { id: 'asc' },
    });
  }

  create(accountId: number, dto: CreateCompanyBankAccountDto) {
    return (this.prisma as any).companyBankAccount.create({
      data: { ...this.normalize(dto), accountId },
    });
  }

  async update(accountId: number, id: number, dto: UpdateCompanyBankAccountDto) {
    const existing = await this.findOwned(accountId, id);
    return (this.prisma as any).companyBankAccount.update({
      where: { id: existing.id },
      data: this.normalize(dto),
    });
  }

  async remove(accountId: number, id: number) {
    const existing = await this.findOwned(accountId, id);
    await (this.prisma as any).companyBankAccount.delete({
      where: { id: existing.id },
    });
    return { id: existing.id };
  }

  private async findOwned(accountId: number, id: number) {
    const row = await (this.prisma as any).companyBankAccount.findFirst({
      where: { id, accountId },
    });
    if (!row) throw new NotFoundException('Bank account not found');
    return row;
  }

  private normalize<T extends Record<string, any>>(dto: T): T {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v === undefined) continue;
      result[k] = v === '' ? null : v;
    }
    return result as T;
  }
}
