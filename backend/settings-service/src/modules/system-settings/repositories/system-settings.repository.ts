import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateSystemSettingsDto } from '../dto/update-system-settings.dto';

const SELECT = {
  id: true,
  name: true,
  subdomain: true,
  settings: true,
  status: true,
};

@Injectable()
export class SystemSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAccountId(accountId: number) {
    return (this.prisma as any).account.findUnique({
      where: { id: accountId },
      select: SELECT,
    });
  }

  async update(accountId: number, dto: UpdateSystemSettingsDto) {
    const current = await this.findByAccountId(accountId);
    const currentSettings = (current?.settings as Record<string, unknown>) ?? {};

    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }

    if (dto.settings !== undefined) {
      // Merge new settings into existing JSONB — no field is lost on partial update
      updateData.settings = { ...currentSettings, ...dto.settings };
    }

    return (this.prisma as any).account.update({
      where: { id: accountId },
      data: updateData,
      select: SELECT,
    });
  }
}
