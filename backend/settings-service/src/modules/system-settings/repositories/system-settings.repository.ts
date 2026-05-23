import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateSystemSettingsDto } from '../dto/update-system-settings.dto';

const SELECT = {
  id: true,
  name: true,
  subdomain: true,
  settings: true,
  status: true,
  legalForm: true,
  inn: true,
  kpp: true,
  ogrn: true,
  legalAddress: true,
  actualAddress: true,
  phone: true,
  phoneExt: true,
  email: true,
  directorUserId: true,
  accountantUserId: true,
};

const SCALAR_FIELDS: (keyof UpdateSystemSettingsDto)[] = [
  'legalForm',
  'inn',
  'kpp',
  'ogrn',
  'legalAddress',
  'actualAddress',
  'phone',
  'phoneExt',
  'email',
  'directorUserId',
  'accountantUserId',
];

@Injectable()
export class SystemSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAccountId(accountId: number) {
    const account = await (this.prisma as any).account.findUnique({
      where: { id: accountId },
      select: { ...SELECT, bankAccounts: { orderBy: { id: 'asc' } } },
    });
    return account;
  }

  async update(accountId: number, dto: UpdateSystemSettingsDto) {
    const current = await (this.prisma as any).account.findUnique({
      where: { id: accountId },
      select: { settings: true },
    });
    const currentSettings = (current?.settings as Record<string, unknown>) ?? {};

    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.settings !== undefined) {
      updateData.settings = { ...currentSettings, ...dto.settings };
    }

    for (const field of SCALAR_FIELDS) {
      const value = dto[field];
      if (value !== undefined) {
        updateData[field] = value === '' ? null : value;
      }
    }

    await (this.prisma as any).account.update({
      where: { id: accountId },
      data: updateData,
    });

    return this.findByAccountId(accountId);
  }
}
