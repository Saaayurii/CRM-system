import { Injectable, NotFoundException } from '@nestjs/common';
import { SystemSettingsRepository } from './repositories/system-settings.repository';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { RedisPublisherService } from '../../redis/redis-publisher.service';

@Injectable()
export class SystemSettingsService {
  constructor(
    private readonly repo: SystemSettingsRepository,
    private readonly publisher: RedisPublisherService,
  ) {}

  async getSettings(accountId: number) {
    const account = await this.repo.findByAccountId(accountId);
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async updateSettings(accountId: number, dto: UpdateSystemSettingsDto) {
    const account = await this.repo.findByAccountId(accountId);
    if (!account) throw new NotFoundException('Account not found');

    const updated = await this.repo.update(accountId, dto);

    // Publish maintenance event whenever maintenance-related settings change
    if (dto.settings && 'maintenance_mode' in dto.settings) {
      const settings = updated.settings as Record<string, unknown>;
      await this.publisher.publishMaintenance({
        accountId,
        mode: Boolean(settings.maintenance_mode),
        allowedRoles: (settings.maintenance_allowed_roles as string[]) ?? [],
      });
    }

    return updated;
  }
}
