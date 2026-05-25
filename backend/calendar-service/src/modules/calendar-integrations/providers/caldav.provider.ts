import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { decryptSecret } from '../crypto.util';

/**
 * CalDAV provider for Yandex/Apple/generic providers.
 *
 * NOTE: tsdav пакет используется отложенно (require внутри метода),
 * чтобы при отсутствии настроенных интеграций сервис не падал при старте.
 *
 * Yandex: caldav.yandex.ru, требует app-password (Яндекс Ключ).
 * Apple:  caldav.icloud.com, требует app-specific password (appleid.apple.com).
 */
@Injectable()
export class CalDavProvider {
  private readonly logger = new Logger(CalDavProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  private async loadTsdav(): Promise<any> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('tsdav');
    } catch (e) {
      throw new Error('Установите пакет tsdav в calendar-service: npm i tsdav');
    }
  }

  async probe(url: string, username: string, password: string): Promise<{ homeUrl?: string; calendars?: any[] }> {
    const tsdav = await this.loadTsdav();
    const client = new tsdav.DAVClient({
      serverUrl: url,
      credentials: { username, password },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });
    await client.login();
    const calendars = await client.fetchCalendars();
    return {
      homeUrl: client.account?.homeUrl,
      calendars: (calendars || []).map((c: any) => ({
        url: c.url,
        displayName: c.displayName,
        ctag: c.ctag,
      })),
    };
  }

  async syncIncremental(row: any): Promise<{ imported: number; updated: number; deleted: number }> {
    const tsdav = await this.loadTsdav();
    const password = decryptSecret(row.caldavPasswordEnc);
    const client = new tsdav.DAVClient({
      serverUrl: row.caldavUrl,
      credentials: { username: row.caldavUsername, password },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });
    await client.login();

    const calendars = await client.fetchCalendars();
    const target =
      calendars.find((c: any) => c.url === row.externalCalendarId) ||
      calendars[0];
    if (!target) throw new Error('CalDAV: календарь не найден');

    const objects = await client.fetchCalendarObjects({ calendar: target });

    let imported = 0, updated = 0;
    const seenExternalIds = new Set<string>();

    for (const obj of objects) {
      const ics: string = obj.data;
      const parsed = parseSingleVEvent(ics);
      if (!parsed) continue;
      const externalId = parsed.uid || obj.url;
      seenExternalIds.add(externalId);

      const payload: any = {
        accountId: row.accountId,
        userId: row.userId,
        title: parsed.summary || '(без названия)',
        description: parsed.description ?? null,
        location: parsed.location ?? null,
        startDatetime: parsed.start,
        endDatetime: parsed.end,
        isAllDay: parsed.allDay,
        status: 'scheduled',
        recurrenceRule: parsed.rrule ?? null,
        externalId,
        externalProvider: row.provider,
        externalEtag: obj.etag,
        integrationId: row.id,
        sourceType: 'external',
        eventType: 'external',
        syncedAt: new Date(),
      };

      const existing = await (this.prisma as any).calendarEvent.findFirst({
        where: { externalProvider: row.provider, externalId, integrationId: row.id },
      });
      if (existing) {
        if (existing.externalEtag !== obj.etag) {
          await (this.prisma as any).calendarEvent.update({ where: { id: existing.id }, data: payload });
          updated++;
        }
      } else {
        await (this.prisma as any).calendarEvent.create({ data: payload });
        imported++;
      }
    }

    // Удалить локальные, которых больше нет на сервере
    const orphans = await (this.prisma as any).calendarEvent.findMany({
      where: { integrationId: row.id, externalProvider: row.provider, NOT: { externalId: null } },
      select: { id: true, externalId: true },
    });
    let deleted = 0;
    for (const o of orphans) {
      if (o.externalId && !seenExternalIds.has(o.externalId)) {
        await (this.prisma as any).calendarEvent.delete({ where: { id: o.id } });
        deleted++;
      }
    }

    await (this.prisma as any).calendarIntegration.update({
      where: { id: row.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'ok',
        lastSyncError: null,
        externalCalendarId: target.url,
      },
    });

    return { imported, updated, deleted };
  }

  async pushEvent(row: any, event: any): Promise<{ externalId?: string; etag?: string }> {
    const tsdav = await this.loadTsdav();
    const password = decryptSecret(row.caldavPasswordEnc);
    const client = new tsdav.DAVClient({
      serverUrl: row.caldavUrl,
      credentials: { username: row.caldavUsername, password },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });
    await client.login();

    const calendars = await client.fetchCalendars();
    const target =
      calendars.find((c: any) => c.url === row.externalCalendarId) || calendars[0];
    if (!target) throw new Error('CalDAV: календарь не найден');

    const uid = event.externalId || `${event.id}-${Date.now()}@crm`;
    const ics = buildVEvent({ ...event, uid });

    if (event.externalId) {
      const objs = await client.fetchCalendarObjects({ calendar: target });
      const obj = objs.find((o: any) => o.data?.includes(`UID:${event.externalId}`));
      if (obj) {
        await client.updateCalendarObject({ calendarObject: { ...obj, data: ics } });
        return { externalId: event.externalId };
      }
    }
    const result = await client.createCalendarObject({
      calendar: target,
      filename: `${uid}.ics`,
      iCalString: ics,
    });
    return { externalId: uid, etag: result?.etag };
  }

  async deleteEvent(row: any, externalId: string): Promise<void> {
    const tsdav = await this.loadTsdav();
    const password = decryptSecret(row.caldavPasswordEnc);
    const client = new tsdav.DAVClient({
      serverUrl: row.caldavUrl,
      credentials: { username: row.caldavUsername, password },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });
    await client.login();
    const calendars = await client.fetchCalendars();
    const target =
      calendars.find((c: any) => c.url === row.externalCalendarId) || calendars[0];
    if (!target) return;
    const objs = await client.fetchCalendarObjects({ calendar: target });
    const obj = objs.find((o: any) => o.data?.includes(`UID:${externalId}`));
    if (obj) await client.deleteCalendarObject({ calendarObject: obj });
  }
}

/** Минимальный парсер одиночного VEVENT из ICS. */
function parseSingleVEvent(ics: string): {
  uid?: string;
  summary?: string;
  description?: string;
  location?: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  rrule?: string;
} | null {
  const veventMatch = ics.match(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/);
  if (!veventMatch) return null;
  const block = veventMatch[1];

  const get = (key: string) => {
    const m = block.match(new RegExp(`^${key}(?:;[^:]*)?:(.+)$`, 'm'));
    return m?.[1]?.trim();
  };

  const parseDate = (val?: string, asDate?: boolean): Date | undefined => {
    if (!val) return undefined;
    if (/^\d{8}T\d{6}Z$/.test(val)) {
      return new Date(
        `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}T${val.slice(9,11)}:${val.slice(11,13)}:${val.slice(13,15)}Z`,
      );
    }
    if (/^\d{8}T\d{6}$/.test(val)) {
      return new Date(
        `${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}T${val.slice(9,11)}:${val.slice(11,13)}:${val.slice(13,15)}`,
      );
    }
    if (/^\d{8}$/.test(val)) {
      return new Date(`${val.slice(0,4)}-${val.slice(4,6)}-${val.slice(6,8)}T00:00:00`);
    }
    return new Date(val);
  };

  const dtstartRaw = block.match(/^DTSTART(?:;([^:]*))?:(.+)$/m);
  const dtendRaw = block.match(/^DTEND(?:;([^:]*))?:(.+)$/m);
  const allDay =
    !!dtstartRaw?.[1]?.includes('VALUE=DATE') ||
    !!(dtstartRaw && /^\d{8}$/.test(dtstartRaw[2]));
  const start = parseDate(dtstartRaw?.[2]?.trim(), allDay);
  if (!start) return null;

  return {
    uid: get('UID'),
    summary: get('SUMMARY'),
    description: get('DESCRIPTION'),
    location: get('LOCATION'),
    start,
    end: parseDate(dtendRaw?.[2]?.trim(), allDay),
    allDay,
    rrule: block.match(/^RRULE:(.+)$/m)?.[1]?.trim(),
  };
}

function pad(n: number) { return String(n).padStart(2, '0'); }
function fmtICSDate(d: Date, allDay: boolean): string {
  if (allDay) {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  }
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function buildVEvent(event: any): string {
  const allDay = !!event.isAllDay;
  const dtType = allDay ? ';VALUE=DATE' : '';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CRM//Calendar//RU',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${fmtICSDate(new Date(), false)}`,
    `DTSTART${dtType}:${fmtICSDate(new Date(event.startDatetime), allDay)}`,
  ];
  if (event.endDatetime) {
    lines.push(`DTEND${dtType}:${fmtICSDate(new Date(event.endDatetime), allDay)}`);
  }
  if (event.title) lines.push(`SUMMARY:${escapeIcs(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`);
  if (event.recurrenceRule) lines.push(`RRULE:${event.recurrenceRule}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}
function escapeIcs(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}
