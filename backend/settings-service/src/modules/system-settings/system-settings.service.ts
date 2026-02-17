import { Injectable, NotFoundException } from '@nestjs/common';
import { SystemSettingsRepository } from './repositories/system-settings.repository';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';

@Injectable()
export class SystemSettingsService {
  constructor(private readonly repo: SystemSettingsRepository) {}

  async getSettings(accountId: number) {
    const account = await this.repo.findByAccountId(accountId);
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async updateSettings(accountId: number, dto: UpdateSystemSettingsDto) {
    const account = await this.repo.findByAccountId(accountId);
    if (!account) throw new NotFoundException('Account not found');
    return this.repo.update(accountId, dto);
  }
}
