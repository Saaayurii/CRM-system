import { Injectable, NotFoundException } from '@nestjs/common';
import { SystemSettingsRepository } from './repositories/system-settings.repository';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';

@Injectable()
export class SystemSettingsService {
  constructor(private readonly repo: SystemSettingsRepository) {}
  async getSettings(accountId: number) {
    const a = await this.repo.findByAccountId(accountId);
    if (!a) throw new NotFoundException('Account not found');
    return a;
  }
  async updateSettings(accountId: number, dto: UpdateSystemSettingsDto) {
    return this.repo.update(accountId, dto);
  }
}
