import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import axios from 'axios';

// URL resource segment → entityType label
const PATH_TO_ENTITY: Record<string, string> = {
  users: 'user',
  tasks: 'task',
  projects: 'project',
  'construction-sites': 'construction_site',
  materials: 'material',
  suppliers: 'supplier',
  payments: 'payment',
  budgets: 'budget',
  invoices: 'invoice',
  inspections: 'inspection',
  defects: 'defect',
  hr: 'hr_record',
  employees: 'employee',
  payroll: 'payroll',
  calendar: 'calendar_event',
  equipment: 'equipment',
  documents: 'document',
  clients: 'client',
  wiki: 'wiki_article',
  training: 'training',
  notifications: 'notification',
  'registration-requests': 'registration',
  roles: 'role',
  settings: 'setting',
  dictionary: 'dictionary',
  automation: 'automation',
};

const METHOD_TO_ACTION: Record<string, string> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

// Descriptions in Russian
const ACTION_NAMES: Record<string, string> = {
  create: 'Создание',
  update: 'Изменение',
  delete: 'Удаление',
  login: 'Вход',
  logout: 'Выход',
  approve: 'Одобрение',
  reject: 'Отклонение',
};

const ENTITY_NAMES: Record<string, string> = {
  user: 'пользователя',
  task: 'задачи',
  project: 'проекта',
  construction_site: 'объекта',
  material: 'материала',
  supplier: 'поставщика',
  payment: 'платежа',
  budget: 'бюджета',
  invoice: 'счёта',
  inspection: 'инспекции',
  defect: 'дефекта',
  hr_record: 'HR записи',
  employee: 'сотрудника',
  payroll: 'зарплаты',
  calendar_event: 'события',
  equipment: 'оборудования',
  document: 'документа',
  client: 'клиента',
  wiki_article: 'статьи',
  training: 'обучения',
  notification: 'уведомления',
  registration: 'заявки',
  role: 'роли',
  setting: 'настройки',
  dictionary: 'справочника',
  automation: 'автоматизации',
  auth: 'сессии',
};

// Paths that must not be audited
const SKIP_PATTERNS = [
  /\/health/,
  /\/event-logs/,
  /\/auth\/refresh/,
  /\/auth\/me/,
  /\/upload/,
  /\/chat\//,            // chat messages create too much noise
];

const SENSITIVE_FIELDS = new Set([
  'password', 'passwordHash', 'refreshToken', 'token', 'accessToken',
  'secret', 'pin', 'passportData',
]);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  private readonly auditUrl =
    process.env.AUDIT_SERVICE_URL || 'http://localhost:3017';

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, url } = request;

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    if (SKIP_PATTERNS.some((p) => p.test(url))) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (responseData: unknown) => {
          // fire-and-forget — never blocks the main request
          this.logEvent(request, method, url, responseData).catch((err) => {
            this.logger.warn(`Audit log failed: ${err?.message}`);
          });
        },
      }),
    );
  }

  private async logEvent(
    request: Request,
    method: string,
    url: string,
    responseData: unknown,
  ): Promise<void> {
    const user = (request as any).user as
      | { sub?: number; userId?: number; accountId?: number; email?: string }
      | undefined;

    const userId = user?.sub ?? user?.userId;
    const accountId = user?.accountId;

    const { action, entityType, entityId, description } = this.parseRequest(
      method,
      url,
      request.body,
    );

    const rawIp =
      (request.headers['x-forwarded-for'] as string)
        ?.split(',')[0]
        ?.trim() ?? request.ip ?? '';
    // Strip IPv4-mapped IPv6 prefix (::ffff:1.2.3.4 → 1.2.3.4)
    const ip = rawIp.replace(/^::ffff:/i, '');

    const payload = {
      accountId,
      eventType: 'user_action',
      eventCategory: entityType === 'auth' ? 'auth' : 'crud',
      action,
      entityType,
      entityId,
      userId,
      ipAddress: ip.substring(0, 50),
      userAgent: request.get('user-agent')?.substring(0, 255),
      description,
      changes: this.buildChanges(method, request.body, responseData),
      metadata: user?.email ? { userEmail: user.email } : undefined,
    };

    await axios.post(`${this.auditUrl}/event-logs`, payload, {
      timeout: 3000,
    });
  }

  private parseRequest(
    method: string,
    url: string,
    body: unknown,
  ): {
    action: string;
    entityType: string;
    entityId?: number;
    description: string;
  } {
    const path = url.split('?')[0];
    const segments = path.split('/').filter(Boolean);

    // Special-case: auth events
    if (path.includes('/auth/login')) {
      const email = (body as Record<string, unknown>)?.email ?? '';
      return {
        action: 'login',
        entityType: 'auth',
        description: `Вход в систему${email ? ': ' + email : ''}`,
      };
    }
    if (path.includes('/auth/logout')) {
      return { action: 'logout', entityType: 'auth', description: 'Выход из системы' };
    }

    // Registration approve/reject
    if (path.includes('/approve')) {
      const id = this.extractId(segments);
      return {
        action: 'approve',
        entityType: 'registration',
        entityId: id,
        description: this.describe('approve', 'registration', id),
      };
    }
    if (path.includes('/reject')) {
      const id = this.extractId(segments);
      return {
        action: 'reject',
        entityType: 'registration',
        entityId: id,
        description: this.describe('reject', 'registration', id),
      };
    }

    const action = METHOD_TO_ACTION[method] ?? method.toLowerCase();

    // Find resource segment after /api/v1/
    const v1Index = segments.indexOf('v1');
    const resourceSegment = v1Index >= 0 ? segments[v1Index + 1] : segments[0];
    const entityType = PATH_TO_ENTITY[resourceSegment] ?? resourceSegment ?? 'unknown';
    const entityId = this.extractId(segments);

    return {
      action,
      entityType,
      entityId,
      description: this.describe(action, entityType, entityId),
    };
  }

  private extractId(segments: string[]): number | undefined {
    for (let i = segments.length - 1; i >= 0; i--) {
      const n = parseInt(segments[i], 10);
      if (!isNaN(n) && String(n) === segments[i]) return n;
    }
    return undefined;
  }

  private describe(action: string, entityType: string, id?: number): string {
    const a = ACTION_NAMES[action] ?? action;
    const e = ENTITY_NAMES[entityType] ?? entityType;
    return id ? `${a} ${e} #${id}` : `${a} ${e}`;
  }

  private buildChanges(
    method: string,
    body: unknown,
    _response: unknown,
  ): Record<string, unknown> | undefined {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined;
    const clean = this.sanitize(body as Record<string, unknown>);
    if (Object.keys(clean).length === 0) return undefined;
    return method === 'POST' ? { new: clean } : { changes: clean };
  }

  private sanitize(obj: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (!SENSITIVE_FIELDS.has(k)) out[k] = v;
    }
    return out;
  }
}
