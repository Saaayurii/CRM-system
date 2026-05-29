import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';

export interface FeedEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  color?: string;
  sourceType: string;
  sourceId?: number | string;
  projectId?: number;
  taskId?: number;
  userId?: number;
  status?: string;
  url?: string;
  editable?: boolean;
  extendedProps?: Record<string, any>;
}

const COLOR_BY_SOURCE: Record<string, string> = {
  manual: '#3b82f6',
  task: '#f59e0b',
  inspection: '#10b981',
  time_off: '#a855f7',
  attendance: '#64748b',
  project: '#0ea5e9',
  external_google: '#ea4335',
  external_yandex: '#ffcc00',
  external_apple: '#000000',
};

@Injectable()
export class CalendarFeedService {
  private readonly logger = new Logger(CalendarFeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async getFeed(
    accountId: number,
    userId: number,
    query: {
      start: string;
      end: string;
      sources?: string[];
      projectId?: number;
      mine?: boolean;
    },
    authToken?: string,
    accountHeader?: string,
  ): Promise<FeedEvent[]> {
    const sources = query.sources?.length
      ? query.sources
      : ['calendar', 'tasks', 'inspections', 'timeoff', 'projects'];

    const tasks: Promise<FeedEvent[]>[] = [];
    if (sources.includes('calendar') || sources.includes('external'))
      tasks.push(this.fromCalendarEvents(accountId, userId, query, sources));
    if (sources.includes('tasks'))
      tasks.push(this.fromTasks(accountId, userId, query, authToken, accountHeader));
    if (sources.includes('inspections'))
      tasks.push(this.fromInspections(accountId, userId, query, authToken, accountHeader));
    if (sources.includes('timeoff'))
      tasks.push(this.fromTimeOff(accountId, userId, query, authToken, accountHeader));
    if (sources.includes('attendance'))
      tasks.push(this.fromAttendance(accountId, userId, query, authToken, accountHeader));
    if (sources.includes('projects'))
      tasks.push(this.fromProjects(accountId, userId, query, authToken, accountHeader));

    const results = await Promise.allSettled(tasks);
    const flat: FeedEvent[] = [];
    results.forEach((r) => {
      if (r.status === 'fulfilled') flat.push(...r.value);
      else this.logger.warn(`Feed source failed: ${r.reason}`);
    });
    return flat;
  }

  async debugFeed(
    accountId: number,
    userId: number,
    query: { start: string; end: string; sources?: string[]; projectId?: number; mine?: boolean },
    authToken?: string,
    accountHeader?: string,
  ): Promise<any> {
    const sources = query.sources?.length
      ? query.sources
      : ['calendar', 'tasks', 'inspections', 'timeoff', 'attendance', 'projects'];

    const probe = async (name: string, fn: () => Promise<FeedEvent[]>) => {
      const t0 = Date.now();
      try {
        const r = await fn();
        return { name, ok: true, count: r.length, ms: Date.now() - t0 };
      } catch (e: any) {
        return { name, ok: false, error: e?.message || String(e), ms: Date.now() - t0 };
      }
    };

    const probes = await Promise.all([
      probe('calendar', () => this.fromCalendarEvents(accountId, userId, query, sources)),
      probe('tasks', () => this.fromTasks(accountId, userId, query, authToken, accountHeader)),
      probe('inspections', () => this.fromInspections(accountId, userId, query, authToken, accountHeader)),
      probe('timeoff', () => this.fromTimeOff(accountId, userId, query, authToken, accountHeader)),
      probe('attendance', () => this.fromAttendance(accountId, userId, query, authToken, accountHeader)),
      probe('projects', () => this.fromProjects(accountId, userId, query, authToken, accountHeader)),
    ]);

    return {
      accountId,
      userId,
      range: { start: query.start, end: query.end },
      mine: !!query.mine,
      sourcesRequested: sources,
      serviceUrls: {
        tasks: this.config.get('TASKS_SERVICE_URL'),
        inspections: this.config.get('INSPECTIONS_SERVICE_URL'),
        hr: this.config.get('HR_SERVICE_URL'),
        projects: this.config.get('PROJECTS_SERVICE_URL'),
      },
      sources: probes,
    };
  }

  private async fromCalendarEvents(
    accountId: number,
    userId: number,
    query: { start: string; end: string; projectId?: number; mine?: boolean },
    sources: string[],
  ): Promise<FeedEvent[]> {
    const where: any = {
      accountId,
      startDatetime: {
        gte: new Date(query.start),
        lte: new Date(query.end),
      },
    };
    if (query.projectId) where.projectId = query.projectId;
    if (query.mine) {
      where.OR = [
        { userId },
        { organizerId: userId },
        { participants: { array_contains: userId } },
      ];
    }
    if (!sources.includes('external')) {
      where.externalProvider = null;
    }

    const rows = await (this.prisma as any).calendarEvent.findMany({
      where,
      orderBy: { startDatetime: 'asc' },
    });

    return rows.map((r: any): FeedEvent => {
      const isExternal = !!r.externalProvider;
      const source = isExternal ? `external_${r.externalProvider}` : 'manual';
      return {
        id: `calendar:${r.id}`,
        title: r.title,
        start: r.startDatetime.toISOString(),
        end: r.endDatetime?.toISOString(),
        allDay: r.isAllDay,
        color: r.colorHex || COLOR_BY_SOURCE[source],
        sourceType: source,
        sourceId: r.id,
        projectId: r.projectId ?? undefined,
        taskId: r.taskId ?? undefined,
        userId: r.userId ?? undefined,
        status: r.status,
        editable: !isExternal || r.externalProvider === 'google', // Google two-way
        extendedProps: {
          eventType: r.eventType,
          location: r.location,
          description: r.description,
          recurrenceRule: r.recurrenceRule,
          customTypeId: r.customTypeId,
          integrationId: r.integrationId,
          externalProvider: r.externalProvider,
        },
      };
    });
  }

  private async fromTasks(
    accountId: number,
    userId: number,
    query: { start: string; end: string; projectId?: number; mine?: boolean },
    authToken?: string,
    accountHeader?: string,
  ): Promise<FeedEvent[]> {
    const baseUrl = this.config.get<string>('TASKS_SERVICE_URL') ||
      this.config.get<string>('tasksServiceUrl') ||
      'http://tasks-service:3004';
    try {
      const url = `${baseUrl}/tasks?limit=500${query.projectId ? `&projectId=${query.projectId}` : ''}`;
      const { data } = await firstValueFrom(
        this.http.get(url, { headers: this.auth(authToken, accountHeader) }),
      );
      const items: any[] = data?.tasks ?? data?.data ?? (Array.isArray(data) ? data : []);
      const startD = new Date(query.start).getTime();
      const endD = new Date(query.end).getTime();
      const out: FeedEvent[] = [];
      for (const t of items) {
        const due = t.dueDate ?? t.due_date;
        if (!due) continue;
        const dueTs = new Date(due).getTime();
        if (Number.isNaN(dueTs)) continue;

        // Use startDate if available, otherwise fall back to dueDate
        const rawStart = t.startDate ?? t.start_date ?? due;
        const startTs = new Date(rawStart).getTime();

        // Include task if it overlaps with the view range
        if (dueTs < startD || startTs > endD) continue;

        if (query.mine) {
          const isMine =
            t.createdByUserId === userId ||
            t.created_by_user_id === userId ||
            t.assignedToUserId === userId ||
            t.assigned_to_user_id === userId ||
            (t.assignees ?? []).some(
              (a: any) => a.userId === userId || a.user_id === userId,
            );
          if (!isMine) continue;
        }

        // Collect unique assignee user IDs
        const assigneeIds = new Set<number>();
        const primary = t.assignedToUserId ?? t.assigned_to_user_id;
        if (primary) assigneeIds.add(primary);
        for (const a of (t.assignees ?? [])) {
          const uid = a.userId ?? a.user_id;
          if (uid) assigneeIds.add(uid);
        }

        const base: Omit<FeedEvent, 'id' | 'userId'> = {
          title: t.title,
          start: new Date(rawStart).toISOString(),
          end: new Date(due).toISOString(),
          allDay: true,
          color: COLOR_BY_SOURCE.task,
          sourceType: 'task',
          sourceId: t.id,
          projectId: t.projectId ?? t.project_id,
          taskId: t.id,
          status: t.status,
          editable: false,
          url: `/dashboard/tasks?taskId=${t.id}`,
          extendedProps: {
            priority: t.priority,
            status: t.status,
            description: t.description,
          },
        };

        if (assigneeIds.size > 0) {
          // One event per assignee so each appears in their user row on the timeline
          for (const uid of assigneeIds) {
            out.push({ ...base, id: `task:${t.id}:u${uid}`, userId: uid });
          }
        } else {
          // No assignee — show under the project row
          out.push({ ...base, id: `task:${t.id}` });
        }
      }
      this.logger.debug(`tasks: ${out.length} of ${items.length} items mapped`);
      return out;
    } catch (e: any) {
      this.logger.warn(`tasks feed failed: ${e?.message}`);
      return [];
    }
  }

  private async fromInspections(
    accountId: number,
    userId: number,
    query: { start: string; end: string; projectId?: number; mine?: boolean },
    authToken?: string,
    accountHeader?: string,
  ): Promise<FeedEvent[]> {
    const baseUrl = this.config.get<string>('INSPECTIONS_SERVICE_URL') ||
      'http://inspections-service:3008';
    try {
      const url = `${baseUrl}/inspections?limit=500${query.projectId ? `&projectId=${query.projectId}` : ''}`;
      const { data } = await firstValueFrom(
        this.http.get(url, { headers: this.auth(authToken, accountHeader) }),
      );
      const items: any[] = data?.data ?? data ?? [];
      const startD = new Date(query.start).getTime();
      const endD = new Date(query.end).getTime();
      return items
        .filter((i) => i.scheduledDate || i.scheduled_date)
        .filter((i) => {
          if (query.mine && i.inspectorId !== userId) return false;
          const d = new Date(i.scheduledDate ?? i.scheduled_date).getTime();
          return d >= startD && d <= endD;
        })
        .map(
          (i): FeedEvent => ({
            id: `inspection:${i.id}`,
            title: `[Инспекция] ${i.title ?? i.objectName ?? `#${i.id}`}`,
            start: new Date(i.scheduledDate ?? i.scheduled_date).toISOString(),
            allDay: false,
            color: COLOR_BY_SOURCE.inspection,
            sourceType: 'inspection',
            sourceId: i.id,
            projectId: i.projectId,
            userId: i.inspectorId ?? i.inspector_id ?? undefined,
            status: i.status,
            editable: false,
            url: `/dashboard/inspector/inspections?id=${i.id}`,
          }),
        );
    } catch (e: any) {
      this.logger.warn(`inspections feed failed: ${e?.message}`);
      return [];
    }
  }

  private async fromTimeOff(
    accountId: number,
    userId: number,
    query: { start: string; end: string; mine?: boolean },
    authToken?: string,
    accountHeader?: string,
  ): Promise<FeedEvent[]> {
    const baseUrl = this.config.get<string>('HR_SERVICE_URL') ||
      'http://hr-service:3009';
    try {
      const url = `${baseUrl}/time-off?limit=500`;
      const { data } = await firstValueFrom(
        this.http.get(url, { headers: this.auth(authToken, accountHeader) }),
      );
      const items: any[] = data?.data ?? data ?? [];
      const startD = new Date(query.start).getTime();
      const endD = new Date(query.end).getTime();
      return items
        .filter((t) => t.startDate || t.start_date)
        .filter((t) => {
          if (query.mine && t.userId !== userId) return false;
          const s = new Date(t.startDate ?? t.start_date).getTime();
          const e = new Date(t.endDate ?? t.end_date ?? t.startDate ?? t.start_date).getTime();
          return e >= startD && s <= endD;
        })
        .map(
          (t): FeedEvent => ({
            id: `timeoff:${t.id}`,
            title: `[${t.type ?? 'Отсутствие'}] ${t.userName ?? `user#${t.userId}`}`,
            start: new Date(t.startDate ?? t.start_date).toISOString(),
            end: new Date(
              t.endDate ?? t.end_date ?? t.startDate ?? t.start_date,
            ).toISOString(),
            allDay: true,
            color: COLOR_BY_SOURCE.time_off,
            sourceType: 'time_off',
            sourceId: t.id,
            userId: t.userId,
            status: t.status,
            editable: false,
            url: '/dashboard/hr/time-off',
          }),
        );
    } catch (e: any) {
      this.logger.warn(`time-off feed failed: ${e?.message}`);
      return [];
    }
  }

  private async fromAttendance(
    accountId: number,
    userId: number,
    query: { start: string; end: string; mine?: boolean },
    authToken?: string,
    accountHeader?: string,
  ): Promise<FeedEvent[]> {
    const baseUrl = this.config.get<string>('HR_SERVICE_URL') ||
      'http://hr-service:3009';
    try {
      const url = `${baseUrl}/attendance?limit=500&startDate=${query.start}&endDate=${query.end}`;
      const { data } = await firstValueFrom(
        this.http.get(url, { headers: this.auth(authToken, accountHeader) }),
      );
      const items: any[] = data?.data ?? data ?? [];
      return items
        .filter((a) => a.date && (!query.mine || a.userId === userId))
        .map(
          (a): FeedEvent => ({
            id: `attendance:${a.id}`,
            title: `[Табель] ${a.userName ?? `user#${a.userId}`}`,
            start: a.checkIn ?? a.date,
            end: a.checkOut ?? undefined,
            allDay: !a.checkIn,
            color: COLOR_BY_SOURCE.attendance,
            sourceType: 'attendance',
            sourceId: a.id,
            userId: a.userId,
            editable: false,
          }),
        );
    } catch (e: any) {
      this.logger.warn(`attendance feed failed: ${e?.message}`);
      return [];
    }
  }

  private async fromProjects(
    accountId: number,
    userId: number,
    query: { start: string; end: string; projectId?: number },
    authToken?: string,
    accountHeader?: string,
  ): Promise<FeedEvent[]> {
    const baseUrl = this.config.get<string>('PROJECTS_SERVICE_URL') ||
      'http://projects-service:3003';
    try {
      const url = `${baseUrl}/projects?limit=200`;
      const { data } = await firstValueFrom(
        this.http.get(url, { headers: this.auth(authToken, accountHeader) }),
      );
      const items: any[] = data?.projects ?? data?.data ?? (Array.isArray(data) ? data : []);
      const startD = new Date(query.start).getTime();
      const endD = new Date(query.end).getTime();
      const out: FeedEvent[] = [];
      for (const p of items) {
        if (query.projectId && p.id !== query.projectId) continue;
        const sRaw = p.startDate ?? p.start_date;
        const eRaw =
          p.plannedEndDate ?? p.planned_end_date ??
          p.actualEndDate  ?? p.actual_end_date  ??
          p.endDate        ?? p.end_date;

        if (sRaw) {
          const s = new Date(sRaw).getTime();
          if (!Number.isNaN(s) && s >= startD && s <= endD) {
            out.push({
              id: `project-start:${p.id}`,
              title: `▶ Старт: ${p.name}`,
              start: new Date(sRaw).toISOString(),
              allDay: true,
              color: COLOR_BY_SOURCE.project,
              sourceType: 'project',
              sourceId: p.id,
              projectId: p.id,
              editable: false,
              url: `/dashboard/projects/${p.id}`,
            });
          }
        }
        if (eRaw) {
          const e = new Date(eRaw).getTime();
          if (!Number.isNaN(e) && e >= startD && e <= endD) {
            out.push({
              id: `project-end:${p.id}`,
              title: `■ Финиш: ${p.name}`,
              start: new Date(eRaw).toISOString(),
              allDay: true,
              color: '#ef4444',
              sourceType: 'project',
              sourceId: p.id,
              projectId: p.id,
              editable: false,
              url: `/dashboard/projects/${p.id}`,
            });
          }
        }
      }
      this.logger.debug(`projects: ${out.length} milestones across ${items.length} projects`);
      return out;
    } catch (e: any) {
      this.logger.warn(`projects feed failed: ${e?.message}`);
      return [];
    }
  }

  private auth(token?: string, accountHeader?: string) {
    const h: Record<string, string> = {};
    if (token) {
      h.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    if (accountHeader) {
      h['X-Account-Id'] = String(accountHeader);
    }
    return h;
  }
}
