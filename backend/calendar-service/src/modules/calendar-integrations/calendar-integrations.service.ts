import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { encryptSecret } from './crypto.util';
import { ConnectCalDavDto } from './dto/connect-caldav.dto';
import { GoogleCalendarProvider } from './providers/google.provider';
import { CalDavProvider } from './providers/caldav.provider';

const CALDAV_DEFAULTS: Record<string, string> = {
  yandex: 'https://caldav.yandex.ru',
  apple: 'https://caldav.icloud.com',
};

@Injectable()
export class CalendarIntegrationsService {
  private readonly logger = new Logger(CalendarIntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => GoogleCalendarProvider))
    private readonly google: GoogleCalendarProvider,
    @Inject(forwardRef(() => CalDavProvider))
    private readonly caldav: CalDavProvider,
  ) {}

  async listForUser(accountId: number, userId: number) {
    const rows = await (this.prisma as any).calendarIntegration.findMany({
      where: { accountId, userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r: any) => ({
      id: r.id,
      provider: r.provider,
      displayName: r.displayName,
      externalAccount: r.externalAccount,
      externalCalendarId: r.externalCalendarId,
      syncDirection: r.syncDirection,
      lastSyncAt: r.lastSyncAt,
      lastSyncStatus: r.lastSyncStatus,
      lastSyncError: r.lastSyncError,
      isActive: r.isActive,
      createdAt: r.createdAt,
    }));
  }

  buildGoogleAuthUrl(accountId: number, userId: number): string {
    return this.google.buildAuthUrl(accountId, userId);
  }

  async handleGoogleCallback(code: string, state: string) {
    return this.google.handleCallback(code, state);
  }

  async connectCalDav(accountId: number, userId: number, dto: ConnectCalDavDto) {
    const url = dto.url || CALDAV_DEFAULTS[dto.provider];
    if (!url) throw new BadRequestException('CalDAV URL is required');

    // Probe (verify creds & discover calendars)
    let discovered: { homeUrl?: string; calendars?: any[] } = {};
    try {
      discovered = await this.caldav.probe(url, dto.username, dto.password);
    } catch (e: any) {
      throw new BadRequestException(`CalDAV проверка не прошла: ${e?.message}`);
    }

    const integration = await (this.prisma as any).calendarIntegration.upsert({
      where: {
        userId_provider_externalAccount: {
          userId,
          provider: dto.provider,
          externalAccount: dto.username,
        },
      },
      create: {
        accountId,
        userId,
        provider: dto.provider,
        displayName: dto.provider === 'yandex' ? 'Яндекс Календарь' :
                     dto.provider === 'apple'  ? 'Apple Календарь' : 'CalDAV',
        externalAccount: dto.username,
        caldavUrl: discovered.homeUrl || url,
        caldavUsername: dto.username,
        caldavPasswordEnc: encryptSecret(dto.password),
        externalCalendarId: dto.externalCalendarId,
        syncDirection: dto.syncDirection || 'bidirectional',
        isActive: true,
      },
      update: {
        caldavUrl: discovered.homeUrl || url,
        caldavPasswordEnc: encryptSecret(dto.password),
        externalCalendarId: dto.externalCalendarId,
        syncDirection: dto.syncDirection || 'bidirectional',
        isActive: true,
        lastSyncError: null,
      },
    });

    return { id: integration.id, calendars: discovered.calendars || [] };
  }

  async disconnect(accountId: number, userId: number, id: number) {
    const row = await (this.prisma as any).calendarIntegration.findFirst({
      where: { id, accountId, userId },
    });
    if (!row) throw new NotFoundException();
    // Revoke webhook channel for Google
    if (row.provider === 'google' && row.webhookChannelId) {
      try { await this.google.stopWatch(row); } catch (_) { /* ignore */ }
    }
    await (this.prisma as any).calendarIntegration.delete({ where: { id } });
    return { message: 'Disconnected' };
  }

  async sync(accountId: number, userId: number, id: number) {
    const row = await (this.prisma as any).calendarIntegration.findFirst({
      where: { id, accountId, userId },
    });
    if (!row) throw new NotFoundException();
    try {
      if (row.provider === 'google') return await this.google.syncIncremental(row);
      return await this.caldav.syncIncremental(row);
    } catch (e: any) {
      await (this.prisma as any).calendarIntegration.update({
        where: { id },
        data: { lastSyncStatus: 'error', lastSyncError: String(e?.message || e) },
      });
      throw new BadRequestException(`Sync failed: ${e?.message || e}`);
    }
  }

  async listProviders() {
    return {
      google: {
        configured:
          !!this.config.get('GOOGLE_CLIENT_ID') &&
          !!this.config.get('GOOGLE_CLIENT_SECRET'),
        scopes: ['https://www.googleapis.com/auth/calendar'],
      },
      yandex: { configured: true, caldavUrl: CALDAV_DEFAULTS.yandex },
      apple:  { configured: true, caldavUrl: CALDAV_DEFAULTS.apple },
    };
  }
}
