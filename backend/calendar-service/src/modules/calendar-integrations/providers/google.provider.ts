import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import * as crypto from 'crypto';

/**
 * Google Calendar provider.
 * Uses raw HTTPS calls to Google APIs to avoid pulling googleapis (heavy).
 * Token storage: access_token, refresh_token, expires_at on CalendarIntegration row.
 */
@Injectable()
export class GoogleCalendarProvider {
  private readonly logger = new Logger(GoogleCalendarProvider.name);
  private readonly stateStore = new Map<string, { accountId: number; userId: number; expires: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private clientId() { return this.config.get<string>('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID || ''; }
  private clientSecret() { return this.config.get<string>('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET || ''; }
  private redirectUri() {
    return (
      this.config.get<string>('GOOGLE_REDIRECT_URI') ||
      process.env.GOOGLE_REDIRECT_URI ||
      'http://localhost:3000/api/v1/calendar-integrations/google/callback'
    );
  }

  buildAuthUrl(accountId: number, userId: number): string {
    if (!this.clientId()) throw new Error('GOOGLE_CLIENT_ID не настроен');
    const state = crypto.randomBytes(16).toString('hex');
    this.stateStore.set(state, { accountId, userId, expires: Date.now() + 10 * 60_000 });
    // GC старого state
    for (const [k, v] of this.stateStore) if (v.expires < Date.now()) this.stateStore.delete(k);

    const params = new URLSearchParams({
      client_id: this.clientId(),
      redirect_uri: this.redirectUri(),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email',
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<boolean> {
    const ctx = this.stateStore.get(state);
    if (!ctx || ctx.expires < Date.now()) throw new Error('Invalid OAuth state');
    this.stateStore.delete(state);
    if (!code) throw new Error('Missing code');

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId(),
        client_secret: this.clientSecret(),
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri(),
      }).toString(),
    });
    if (!tokenResp.ok) {
      this.logger.error(`Google token error: ${await tokenResp.text()}`);
      return false;
    }
    const tokens: any = await tokenResp.json();

    // Получить email пользователя
    const userInfoResp = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo: any = userInfoResp.ok ? await userInfoResp.json() : {};

    await (this.prisma as any).calendarIntegration.upsert({
      where: {
        userId_provider_externalAccount: {
          userId: ctx.userId,
          provider: 'google',
          externalAccount: userInfo.email || 'google-user',
        },
      },
      create: {
        accountId: ctx.accountId,
        userId: ctx.userId,
        provider: 'google',
        displayName: 'Google Calendar',
        externalAccount: userInfo.email || 'google-user',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        scope: tokens.scope,
        externalCalendarId: 'primary',
        syncDirection: 'bidirectional',
        isActive: true,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        scope: tokens.scope,
        isActive: true,
        lastSyncError: null,
      },
    });

    return true;
  }

  private async ensureAccessToken(row: any): Promise<string> {
    if (row.accessToken && row.tokenExpiresAt && new Date(row.tokenExpiresAt).getTime() > Date.now() + 60_000) {
      return row.accessToken;
    }
    if (!row.refreshToken) throw new Error('No refresh token; reconnect required');
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId(),
        client_secret: this.clientSecret(),
        refresh_token: row.refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });
    if (!resp.ok) throw new Error(`Token refresh failed: ${await resp.text()}`);
    const tokens: any = await resp.json();
    await (this.prisma as any).calendarIntegration.update({
      where: { id: row.id },
      data: {
        accessToken: tokens.access_token,
        tokenExpiresAt: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
      },
    });
    return tokens.access_token;
  }

  /**
   * Инкрементальная синхронизация через syncToken.
   * Возвращает изменённые/новые/удалённые события и обновляет syncToken.
   */
  async syncIncremental(row: any): Promise<{ imported: number; updated: number; deleted: number }> {
    const token = await this.ensureAccessToken(row);
    const calendarId = encodeURIComponent(row.externalCalendarId || 'primary');
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;
    let imported = 0, updated = 0, deleted = 0;

    do {
      const params = new URLSearchParams({ singleEvents: 'true', maxResults: '250' });
      if (row.syncToken) params.set('syncToken', row.syncToken);
      else params.set('timeMin', new Date(Date.now() - 30 * 24 * 3600_000).toISOString());
      if (pageToken) params.set('pageToken', pageToken);

      const resp = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (resp.status === 410) {
        // Sync token invalidated → reset
        await (this.prisma as any).calendarIntegration.update({
          where: { id: row.id }, data: { syncToken: null },
        });
        return this.syncIncremental({ ...row, syncToken: null });
      }
      if (!resp.ok) throw new Error(`Google list failed: ${await resp.text()}`);
      const data: any = await resp.json();
      pageToken = data.nextPageToken;
      nextSyncToken = data.nextSyncToken || nextSyncToken;

      for (const ev of data.items || []) {
        const isCancelled = ev.status === 'cancelled';
        if (isCancelled) {
          const removed = await (this.prisma as any).calendarEvent.deleteMany({
            where: {
              integrationId: row.id,
              externalProvider: 'google',
              externalId: ev.id,
            },
          });
          deleted += removed.count || 0;
          continue;
        }
        const start = ev.start?.dateTime || ev.start?.date;
        const end = ev.end?.dateTime || ev.end?.date;
        const isAllDay = !!ev.start?.date;
        const payload: any = {
          accountId: row.accountId,
          userId: row.userId,
          title: ev.summary || '(без названия)',
          description: ev.description ?? null,
          location: ev.location ?? null,
          startDatetime: new Date(start),
          endDatetime: end ? new Date(end) : null,
          isAllDay,
          status: 'scheduled',
          recurrenceRule: ev.recurrence?.[0]?.replace(/^RRULE:/, '') ?? null,
          externalId: ev.id,
          externalProvider: 'google',
          externalEtag: ev.etag,
          integrationId: row.id,
          sourceType: 'external',
          eventType: 'external',
          syncedAt: new Date(),
        };

        const existing = await (this.prisma as any).calendarEvent.findFirst({
          where: { externalProvider: 'google', externalId: ev.id, integrationId: row.id },
        });
        if (existing) {
          await (this.prisma as any).calendarEvent.update({ where: { id: existing.id }, data: payload });
          updated++;
        } else {
          await (this.prisma as any).calendarEvent.create({ data: payload });
          imported++;
        }
      }
    } while (pageToken);

    await (this.prisma as any).calendarIntegration.update({
      where: { id: row.id },
      data: {
        syncToken: nextSyncToken ?? row.syncToken,
        lastSyncAt: new Date(),
        lastSyncStatus: 'ok',
        lastSyncError: null,
      },
    });

    return { imported, updated, deleted };
  }

  /** Push local event → Google (insert or update). */
  async pushEvent(row: any, event: any): Promise<{ externalId?: string; etag?: string }> {
    const token = await this.ensureAccessToken(row);
    const calendarId = encodeURIComponent(row.externalCalendarId || 'primary');
    const body: any = {
      summary: event.title,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      start: event.isAllDay
        ? { date: event.startDatetime.toISOString().slice(0, 10) }
        : { dateTime: event.startDatetime.toISOString() },
      end: event.endDatetime
        ? event.isAllDay
          ? { date: event.endDatetime.toISOString().slice(0, 10) }
          : { dateTime: event.endDatetime.toISOString() }
        : undefined,
    };
    if (event.recurrenceRule) body.recurrence = [`RRULE:${event.recurrenceRule}`];

    const url = event.externalId
      ? `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${event.externalId}`
      : `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
    const method = event.externalId ? 'PATCH' : 'POST';

    const resp = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`Google push failed: ${await resp.text()}`);
    const data: any = await resp.json();
    return { externalId: data.id, etag: data.etag };
  }

  async deleteEvent(row: any, externalId: string): Promise<void> {
    const token = await this.ensureAccessToken(row);
    const calendarId = encodeURIComponent(row.externalCalendarId || 'primary');
    const resp = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${externalId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
    );
    if (!resp.ok && resp.status !== 410 && resp.status !== 404) {
      throw new Error(`Google delete failed: ${await resp.text()}`);
    }
  }

  async stopWatch(_row: any): Promise<void> {
    // TODO: implement channels.stop if webhookChannelId/webhookResourceId are stored
    return;
  }
}
